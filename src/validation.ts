import * as yup from "yup";
import { parseBirthDate } from "./age";

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
  // OLC-1028: pedido em todas as clinicas; a faixa etaria do medico e' conferida no envio.
  birth_date: yup
    .string()
    .required("Data de nascimento é obrigatória")
    .test("data-valida", "Data de nascimento inválida", (value) => {
      const birth = value ? parseBirthDate(value) : null;
      return birth !== null && birth <= new Date();
    }),
  procedure: yup.string().required("Procedimento é obrigatório"),
  health_operator: yup.string().required("Convênio é obrigatório"),
});

export default validationSchema;
