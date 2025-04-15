import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { KeyboardArrowLeft, KeyboardArrowRight } from "@mui/icons-material";
import React, { useCallback, useMemo } from "react";
import { Appointments, Procedure, WorkingHours } from "../../types";

type SchedulerProps = {
  onSelect: (date: Date) => void;
  workingHours: WorkingHours[];
  appointments: Appointments[];
  procedure: Procedure | undefined;
  selectedSlot?: Date | null;
};

const Scheduler: React.FC<SchedulerProps> = ({
  onSelect,
  workingHours,
  appointments,
  procedure,
  selectedSlot,
}) => {
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
  const offset = new Date().getTimezoneOffset();
  const workingDaysMap = useMemo(
    () =>
      workingHours.reduce((acc: { [key: number]: WorkingHours }, curr) => {
        acc[curr.weekday] = curr;
        return acc;
      }, {}),
    [workingHours]
  );
  const getSlots = useCallback(
    (day: Date) => {
      day.setMinutes(day.getMinutes() - offset);
      const timeInterval = workingDaysMap[day.getDay()];
      console.log("PERIOD D", day.toISOString(), workingDaysMap, day.getDay());
      if (!timeInterval || !procedure) return [];
      // get day in format YYYY-MM-DD
      const date = day.toISOString().split("T")[0];
      const start = new Date(`${date}T${timeInterval.start}`);
      const end = new Date(`${date}T${timeInterval.end}`);
      const slots: Date[] = [];
      for (
        let moving = new Date(start);
        moving < end;
        moving.setMinutes(moving.getMinutes() + procedure.time)
      ) {
        if (moving < new Date()) continue;
        if (
          !appointments.some((appointment) => {
            const appointmentStart = new Date(appointment.start);
            const appointmentEnd = new Date(appointment.end);
            // console.log(
            //   "comparison",
            //   appointmentStart.toISOString(),
            //   " | ",
            //   moving.toISOString(),
            //   " | ",
            //   appointmentEnd.toISOString()
            // );
            return (
              (moving >= appointmentStart && moving < appointmentEnd) ||
              (moving < appointmentStart &&
                new Date(moving.getTime() + procedure.time * 60000) >
                  appointmentStart)
            );
          })
        )
          slots.push(new Date(moving));
      }
      return slots;
    },
    [appointments, procedure, workingDaysMap]
  );
  if (!procedure) return null;

  const generateDays = (currentDate: Date) => {
    const days: Date[] = [];
    const startOfWeek = currentDate.getDate();
    for (let i = 0; i < 5; i++) {
      const day = new Date(currentDate);
      day.setDate(startOfWeek + i);
      days.push(day);
    }
    return days;
  };

  const subtractDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          flexDirection: "row",
        }}
      >
        <Box>
          <Button onClick={() => setCurrentDate(subtractDays(currentDate, 1))}>
            <KeyboardArrowLeft />
          </Button>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
          }}
        >
          {generateDays(currentDate).map((day, index) => (
            <Box
              key={index}
              sx={{
                width: "100%",
                textAlign: "center",
                padding: 1,
                border: "1px solid #ccc",
                minWidth: "100px",
              }}
            >
              <Box>
                {
                  day
                    .toLocaleDateString("pt-BR", {
                      weekday: "long",
                      month: "short",
                      day: "2-digit",
                    })
                    .split(",")[0]
                }
                <br />
                {
                  day
                    .toLocaleDateString("pt-BR", {
                      weekday: "long",
                      month: "short",
                      day: "2-digit",
                    })
                    .split(",")[1]
                }
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                {getSlots(day).map((slot, slotIndex) => (
                  <Button
                    key={slotIndex}
                    sx={{
                      padding: 0.5,
                      my: 1,
                      background:
                        selectedSlot?.getTime() === slot.getTime()
                          ? "#00327f"
                          : "#fff",
                    }}
                    variant="outlined"
                    onClick={() => {
                      const date = new Date(slot);
                      onSelect(date);
                    }}
                  >
                    {slot.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Button>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
        <Box>
          <Button onClick={() => setCurrentDate(subtractDays(currentDate, -1))}>
            <KeyboardArrowRight />
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Scheduler;
