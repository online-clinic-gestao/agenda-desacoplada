import * as yup from "yup";

const validationSchema = yup.object({
  name: yup.string().required("Nome é obrigatório"),
  phone: yup
    .string()
    .matches(
      /^\(\d{2}\) \d{5}-\d{4}$/,
      "Telefone deve estar no formato (xx) xxxxx-xxxx"
    )
    .required("Phone é obrigatório"),
  email: yup.string().email("E-mail inválido").required("Email é obrigatório"),
  procedure: yup.string().required("Procedimento é obrigatório"),
  health_operator: yup.string().required("Convênio é obrigatório"),
});

export default validationSchema;
