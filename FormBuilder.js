import React, { useState, useEffect, Fragment, useCallback } from 'react';
import {
  Formik,
  Form,
  useFormikContext,
} from 'formik';
import PropTypes from 'prop-types';
import * as Yup from 'yup';
import SpinnerButton from '../SpinnerButton';
import {
  generateTextField,
  generateSelectField,
  generateCheckboxField,
  generateCustomField,
  DatePickerField,
  generateSelectFilterField,
} from './Fields';

import {
  Grid,
  FormLabel,
  Button,
} from '../../../lib/MaterialUi';
import Utilities from '../../../lib/Utility';

import './FormBuilder.scss';

const InputTypes = [
  'text',
  'email',
  'checkbox',
];

const TWO_COLUMN_LAYOUT = '2column';

const InputWithOptions = [
  'select',
  'select-filter',
  'select-multiple-filter',
];


const generateDefaultValueForComponent = (componentType) => {
  switch (componentType) {
    case 'text':
      return '';
    case 'checkbox':
      return false;
    case 'date':
      return null;
    default:
      return '';
  }
};

const FormGroupContainer = ({
  hasStandardLabel,
  label,
  children,
  inputType,
}) => {
  return (
    <Grid container>
      {
        hasStandardLabel ? (
          <>
            <Grid container item xs={1}>
              <FormLabel className="form-label">
                { label } :
              </FormLabel>
            </Grid>
            <Grid container item xs={11}>
              {
                children
              }
            </Grid>
          </>
        ) : (
          <Grid container>
            {
              children
            }
          </Grid>
        )
      }
    </Grid>
  );
};

const footerDefaults = {
  className: 'text-right',
  buttons: {
    cancel: {
      label: 'Cancel',
    },
    submit: {
      label: 'Submit',
    }
  }
};

const FormBuilder = ({
  formConfig,
  layout,
  onCancel,
  onSubmit,
  defaultValues,
  className,
  fieldsGroupIdentifier,
  footer,
  renderFooter,
}) => {

  const footerConfig = {
    ...footerDefaults,
    ...footer,
  };
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /*
   *
   * FormProps is the variable that holds the props
   * that will be passed to the formik component
   *
   */
  const [formProps, setFormProps] = useState(null);
  /*
   * If the layout has 'classic' in its string, then material styled form
   * styles will not be applied
   */
  const hasStandardLabel = (layout.indexOf('classic') > -1);

  useEffect(() => {
    const {
      formValidationSchema,
    } = formConfig;
    /*
     * The validation schema can be either passed directly as an object
     * the validation schema can be generated directly from the validation passed to the field
     */
    let validationSchemaFromFields = {};
    let initialValues = { ...defaultValues };

    const generateFormConfigFromFields = (fields) => {
      fields.forEach((field = {}) => {
        const {
          name: fieldName,
          validation,
          component,
        } = field;
        let fieldInitialValue = defaultValues[fieldName];
        if (typeof fieldInitialValue !== 'boolean' && Utilities.isNil(fieldInitialValue)) {
          fieldInitialValue = generateDefaultValueForComponent(component);
        }
        if (!formValidationSchema && validation) {
          validationSchemaFromFields[fieldName] = validation;
        }
        initialValues[fieldName] = fieldInitialValue;
      });
    };

    if (fieldsGroupIdentifier) {
      const fieldsContainer = formConfig[fieldsGroupIdentifier];
      fieldsContainer.forEach((container) => {
        generateFormConfigFromFields(container.fields);
      });
    } else {
      generateFormConfigFromFields(formConfig.fields);
    }

    setFormProps({
      initialValues,
      validationSchema: (formValidationSchema || Yup.object().shape(validationSchemaFromFields)),
    });
    setIsFormInitialized(true);
  }, [formConfig, defaultValues, fieldsGroupIdentifier]);

  const getFormGroupProps = useCallback(() => {
    if (layout.indexOf(TWO_COLUMN_LAYOUT) !== -1) {
      return {
        xs: 6,
      };
    }
  }, [layout]);

  const generateFormGroup = ({
    formFields,
    fields,
    errors,
    touched,
    index = 1,
    groupName,
    formProps,
  }) => {
    formFields.push(
      <Fragment key={`form-panel-${index}`}>
        {
          groupName && (
            <h4 className="page-title">
              { groupName }
            </h4>
          )
        }
        <Grid container spacing={2}>
          {
            fields.map((field) => {
              let InputField;
              const fieldProps = generateFieldProps(field);
              let fieldClass = '';
              switch (field.component) {
                case 'select':
                  InputField = generateSelectField(fieldProps, errors);
                  break;
                case 'checkbox':
                  InputField = generateCheckboxField(fieldProps, formProps);
                  break;
                case 'date':
                  InputField = <DatePickerField {...fieldProps} />;
                  break;
                case 'custom':
                  InputField = generateCustomField(field, errors);
                  break;
                case 'select-filter':
                  InputField = generateSelectFilterField(fieldProps);
                  break;
                case 'select-multiple-filter':
                  InputField = generateSelectFilterField(fieldProps);
                  break;
                default:
                  InputField = generateTextField(fieldProps, errors);
              }
              return (
                <Grid
                  container
                  item {...getFormGroupProps()}
                  className={`${fieldClass}`}
                >
                  <FormGroupContainer
                    hasStandardLabel={hasStandardLabel}
                    label={fieldProps.label}
                    inputType={field.component}
                  >
                    { InputField }
                    {
                      errors[field.name] && touched[field.name] ? (
                        <div className="invalid-feedback">{errors[field.name]}</div>
                      ) : null
                    }
                  </FormGroupContainer>
                </Grid>
              );
            })
          }
        </Grid>
      </Fragment>
    );
  };
  const generateField = (formProps) => {
    const {
      errors,
      touched,
    } = formProps;
    const formFields = [];
    if (fieldsGroupIdentifier) {
      const fieldsContainer = formConfig[fieldsGroupIdentifier];
      fieldsContainer.forEach((container, index) => {
        generateFormGroup({
          formFields,
          fields: container.fields,
          errors,
          touched,
          index,
          groupName: container.name || '',
          formProps,
        });
      });
    } else {
      generateFormGroup({
        formFields,
        fields: formConfig.fields,
        errors,
        touched,
        index: 1,
        formProps,
      });
    }
    return formFields;
  };

  const generateFieldProps = (field) => {
    const fieldType = {};
    const {
      component,
    } = field;
    if (InputTypes.indexOf(component) > -1) {
      fieldType.type = component;
    } else {
      fieldType.component = component;
    }
    if (
      InputWithOptions.indexOf(component) > -1
    ) {
      fieldType.options = field.options;
    }

    if (fieldType.component === 'select-multiple-filter') {
      fieldType.multiple = true;
    }
    return {
      name: field.name,
      placeholder: field.placeholder,
      label: field.label,
      readOnly: field.readOnly,
      showLabel: !hasStandardLabel,
      ...fieldType,
      // hasRequiredValidation: checkHasRequiredValidation(field.validation),
    };
  };

  const handleFormSubmit = (values) => {
    const formSubmitPromise = onSubmit(values);
    if (formSubmitPromise && formSubmitPromise.then) {
      setIsSubmitting(true);
      formSubmitPromise
        .then(() => {
          setIsSubmitting(false);
        })
        .catch(err => {
          setIsSubmitting(false);
        });
    }
  };

  const generateFooterButtons = (formikProps) => {
    const {
      className,
      buttons,
    } = footerConfig;
    const {
      cancel,
      submit,
    } = buttons;
    if (typeof renderFooter === 'function') {
      return renderFooter({
        submitForm: formikProps.submitForm,
      });
    };
    return (
      <div className={`form-builder-footer-buttons ${className}`}>
        {
          cancel && (
            <Button
              onClick={onCancel}
              className={cancel.className}
            >
              {
                cancel.label || 'cancel'
              }
            </Button>
          )
        }
        {
          submit && (
            <SpinnerButton
              size="lg"
              type="submit"
              isLoading={isSubmitting}
              label={submit.label}
            />
          )
        }
      </div>
    );
  };

  return (
    <div className={`${className} ${layout ? `form-builder-${layout}` : '' }`}>
      {
        isFormInitialized && (
          <Formik
            {...formProps}
            onSubmit={handleFormSubmit}
          >
            {(formikProps) => {
              return (
                <Form className="form-builder-wrapper" autoComplete="off">
                  <div className="form-fields-container mb-4">
                    {
                      generateField(formikProps)
                    }
                  </div>
                  {
                    generateFooterButtons(formikProps)
                  }
                </Form>
              );
            }}
          </Formik>
        )
      }
    </div>
  );
};

FormBuilder.defaultProps = {
  defaultValues: {},
  className: '',
  layout: 'styled',
  formFooterClass: 'text-right',
  customFooterRender: null,
};

FormBuilder.propTypes = {
  formConfig: PropTypes.object,
  layout: PropTypes.string,
  onCancel: PropTypes.func,
  onSubmit: PropTypes.func,
  defaultValues: PropTypes.object,
  className: PropTypes.string,
  fieldsGroupIdentifier: PropTypes.string,
  footer: PropTypes.object,
  CustomFooter: PropTypes.element,
  renderFooter: PropTypes.func,
};



export default FormBuilder;