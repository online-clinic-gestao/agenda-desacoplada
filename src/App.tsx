import React, { useEffect, useState } from "react";
import "./App.css";
import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import Box from "@mui/material/Box";
import StepButton from "@mui/material/StepButton";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Scheduler from "./components/Scheduler/Scheduler";
import { useForm, useWatch } from "react-hook-form";
import schema from "./validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { useHookFormMask } from "use-mask-input";
import { Api } from "./api";
import { Appointments, HealthOperator, Procedure, WorkingHours } from "./types";
import Swal from "sweetalert2";
import { CONFIG } from "./config";

const steps = ["Dados Pessoais", "Agendamento", "Conclusão"];
export type AppProps = {
  logo_url?: string;
  authorization_endpoint?: string;
  environment?: string;
  development_endpoint?: string;
  api_key?: string;
};
const App: React.FC<AppProps> = ({
  logo_url,
  authorization_endpoint,
  environment,
  development_endpoint,
  api_key,
}) => {
  if (logo_url) CONFIG.WHITELABEL_LOGO = logo_url;
  if (authorization_endpoint)
    CONFIG.AUTHORIZATION_ENDPOINT = authorization_endpoint;
  if (environment) CONFIG.ENVIRONMENT = environment;
  if (development_endpoint) CONFIG.DEVELOPMENT_ENDPOINT = development_endpoint;
  if (api_key) CONFIG.X_API_KEY = api_key;

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    control,
    getValues,
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      procedure: "",
      health_operator: "",
    },
  });

  const registerWithMask = useHookFormMask(register);
  const api = new Api();

  const [activeStep, setActiveStep] = useState(0);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [healthOperators, setHealthOperators] = useState<HealthOperator[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [appointments, setAppointments] = useState<Appointments[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [completed, setCompleted] = useState<{
    [k: number]: boolean;
  }>({});
  const [token, setToken] = useState<string | null>(null);

  const [procedureId, healthOperator] = useWatch({
    control,
    name: ["procedure", "health_operator"],
  });
  const procedure = procedures.find((proc) => proc.id == procedureId);

  useEffect(() => {
    if (procedure) {
      const healthOperators = procedure.health_operators;
      setHealthOperators(healthOperators);
    }
  }, [procedure]);
  const totalSteps = () => {
    return steps.length;
  };

  const completedSteps = () => {
    return Object.keys(completed).length;
  };

  const isLastStep = () => {
    return activeStep === totalSteps() - 1;
  };

  const allStepsCompleted = () => {
    return completedSteps() === totalSteps();
  };

  const handleNext = () => {
    const newActiveStep =
      isLastStep() && !allStepsCompleted()
        ? // It's the last step, but not all steps have been completed,
          // find the first step that has been completed
          steps.findIndex((_, i) => !(i in completed))
        : activeStep + 1;
    setActiveStep(newActiveStep);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const resetForm = () => {
    setActiveStep(0);
    setCompleted({});
    setSelectedSlot(null);
    setHealthOperators([]);
    setWorkingHours([]);
    setAppointments([]);
    reset();
  };

  const create = (data: any) => {
    if (selectedSlot === null) return;
    const b = new Date(selectedSlot);
    const offset = new Date().getTimezoneOffset();
    b.setMinutes(b.getMinutes() - offset);

    api
      .createAppointment({ ...data, date: b }, token)
      .then(() => {
        Swal.fire({
          title: "Agendamento realizado com sucesso",
          confirmButtonText: "Fechar",
          showLoaderOnConfirm: true,

          allowOutsideClick: () => !Swal.isLoading(),
        });
        resetForm();
        api.getOneTimeToken().then((response) => {
          setToken(response.access_token);
          setProcedures(response.procedures);
          setWorkingHours(response.working_hours);
          setAppointments(response.appointments);
        });
      })
      .catch((error) => {
        Swal.fire({
          title: "Erro ao realizar agendamento. Tente novamente mais tarde.",
          text: error,
          icon: "error",
          confirmButtonText: "Fechar",
        });
      });
  };

  const handleComplete = () => {
    trigger();

    if (completedSteps() === totalSteps() - 1 && activeStep === 2) {
      if (Object.keys(errors).length > 0 || !selectedSlot) {
        Swal.fire({
          title: "Preencha todos os campos obrigatórios",
          icon: "error",
          confirmButtonText: "Fechar",
        });
        return;
      }
      handleSubmit(create)();
      return;
    }
    setCompleted({
      ...completed,
      [activeStep]: true,
    });
    handleNext();
  };

  const handleReset = () => {
    setActiveStep(0);
    setCompleted({});
  };

  useEffect(() => {
    api.getOneTimeToken().then((response) => {
      setToken(response.access_token);
      setProcedures(response.procedures);
      setWorkingHours(response.working_hours);
      setAppointments(response.appointments);
    });
  }, []);

  const handleSelectSlot = (slot: Date) => {
    setSelectedSlot(slot);
  };

  const PersonalData = () => {
    return (
      <Box>
        <FormControl fullWidth sx={{ m: 1 }}>
          <TextField
            {...register("name")}
            id="outlined-basic"
            label="Nome completo"
            variant="outlined"
            error={errors.name ? true : false}
          />
          <Typography variant="subtitle2" color="red" sx={{ ml: 0, mt: 1 }}>
            {errors.name?.message}
          </Typography>
        </FormControl>
        <FormControl fullWidth sx={{ m: 1 }}>
          <TextField
            {...registerWithMask("phone", ["(99) 99999-9999"])}
            label="Telefone"
            variant="outlined"
            error={errors.phone ? true : false}
          />

          <Typography variant="subtitle2" color="red" sx={{ ml: 0, mt: 1 }}>
            {errors.phone?.message}
          </Typography>
        </FormControl>
        <FormControl fullWidth sx={{ m: 1 }}>
          <TextField
            {...register("email")}
            label="Email"
            variant="outlined"
            error={errors.email ? true : false}
          />
          <Typography variant="subtitle2" color="red" sx={{ ml: 0, mt: 1 }}>
            {errors.email?.message}
          </Typography>
        </FormControl>
      </Box>
    );
  };

  const ExamData = () => {
    return (
      <>
        {" "}
        <FormControl fullWidth sx={{ m: 1 }}>
          <InputLabel id="demo-simple-select-label">Procedimento</InputLabel>

          <Select
            {...register("procedure")}
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            label="Procedimento"
            defaultValue={""}
            value={procedureId}
          >
            {procedures.map((procedure) => (
              <MenuItem key={procedure.id} value={procedure.id}>
                {procedure.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth sx={{ m: 1 }}>
          <InputLabel id="demo-simple-select-label">Convênio</InputLabel>
          <Select
            {...register("health_operator")}
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            label="Convênio"
            defaultValue={""}
            value={healthOperator}
          >
            {healthOperators.map((operator) => (
              <MenuItem key={operator.id} value={operator.id}>
                {operator.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Scheduler
          workingHours={workingHours}
          appointments={appointments}
          onSelect={handleSelectSlot}
          procedure={procedure}
          selectedSlot={selectedSlot}
        />
      </>
    );
  };

  const ReviewStep = () => {
    // slot in format hh:mm
    const slot = selectedSlot?.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <Box
        sx={{ border: "1px solid #ccccccaa", padding: 1, borderRadius: "5px" }}
      >
        <Typography variant="h6">Resumo</Typography>
        <hr />
        <Typography variant="subtitle1">
          <strong>Nome:</strong> {getValues().name}
          <br />
          <strong>Telefone:</strong> {getValues().phone}
          <br />
          <strong>Email:</strong> {getValues().email}
          <br />
          <strong>Procedimento:</strong> {procedure?.name}
          <br />
          <strong>Convênio:</strong> {healthOperator}
          <br />
          <strong>Data:</strong> {selectedSlot?.toLocaleDateString("pt-BR")} às{" "}
          {slot}
        </Typography>
      </Box>
    );
  };

  return (
    <>
      <Box sx={{}}>
        <Typography>
          {CONFIG.WHITELABEL_LOGO ? (
            <img src={CONFIG.WHITELABEL_LOGO} style={{ width: "200px" }} />
          ) : (
            "Onlineclinic"
          )}
        </Typography>
        <hr />
        <Stepper nonLinear activeStep={activeStep}>
          {steps.map((label, index) => (
            <Step key={label} completed={completed[index]}>
              <StepButton color="inherit">{label}</StepButton>
            </Step>
          ))}
        </Stepper>
        <div>
          {allStepsCompleted() ? (
            <React.Fragment>
              <Typography sx={{ mt: 2, mb: 1 }}>
                All steps completed - you&apos;re finished
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "row", pt: 2 }}>
                <Box sx={{ flex: "1 1 auto" }} />
                <Button onClick={handleReset}>Reset</Button>
              </Box>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <Box sx={{ mt: 2, mb: 1, py: 1 }}>
                {activeStep === 0 ? <PersonalData /> : null}
                {activeStep === 1 ? <ExamData /> : null}
                {activeStep === 2 ? <ReviewStep /> : null}
              </Box>
              <Box sx={{ display: "flex", flexDirection: "row", pt: 2 }}>
                {activeStep !== 0 ? (
                  <Button color="inherit" onClick={handleBack} sx={{ mr: 1 }}>
                    Voltar
                  </Button>
                ) : null}
                <Box sx={{ flex: "1 1 auto" }} />

                <Button onClick={handleComplete}>
                  {completedSteps() === totalSteps() - 1 && activeStep === 2
                    ? "Finalizar"
                    : "Avançar"}
                </Button>
              </Box>
            </React.Fragment>
          )}
        </div>
      </Box>
    </>
  );
};

export default App;
