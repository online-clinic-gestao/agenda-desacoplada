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
      // Create a copy to avoid mutating the original date
      const dayForCalculation = new Date(day);
      dayForCalculation.setMinutes(dayForCalculation.getMinutes() - offset);
      const timeInterval = workingDaysMap[dayForCalculation.getDay()];

      console.log(
        "PERIOD D",
        dayForCalculation.toISOString(),
        workingDaysMap,
        dayForCalculation.getDay()
      );
      if (!timeInterval || !procedure) {
        return [];
      }
      // get day in format YYYY-MM-DD
      const date = dayForCalculation.toISOString().split("T")[0];
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

  const findFirstAvailableDate = (date: Date) => {
    const maxDate = new Date(date.getFullYear(), date.getMonth() + 3, 0);
    while (date <= maxDate) {
      const slots = getSlots(date);

      if (slots.length > 0) {
        setCurrentDate(date);
        return date;
      }
      date.setDate(date.getDate() + 1);
    }
    return null;
  };

  const findPreviousAvailableDate = (date: Date) => {
    const minDate = new Date(date.getFullYear(), date.getMonth() - 3, 1);
    while (date >= minDate) {
      const slots = getSlots(date);

      if (slots.length > 0) {
        setCurrentDate(date);
        return date;
      }
      date.setDate(date.getDate() - 1);
    }
    return null;
  };

  const generateDays = (currentDate: Date) => {
    const days: Date[] = [];
    const startOfWeek = currentDate.getDate();
    let daysAdd = 0;
    let loopCount = 0;
    const maxLoops = 50; // Safety limit to prevent infinite loops

    for (let i = 0; i < 5 && loopCount < maxLoops; daysAdd++, loopCount++) {
      const day = new Date(currentDate);
      day.setDate(startOfWeek + daysAdd);

      const daySlots = getSlots(new Date(day)); // Create a copy to avoid mutation

      if (daySlots.length === 0) {
        continue; // Skip days with no slots
      }

      days.push(day);
      i++;
    }

    if (loopCount >= maxLoops) {
      console.warn("🚨 DEBUG: generateDays hit maximum loop limit!");
    }

    return days;
  };

  if (!procedure) return null;

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
          <Button
            onClick={() => {
              const newDate = subtractDays(currentDate, 1);
              findPreviousAvailableDate(newDate);
            }}
          >
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
          <Button
            onClick={() => {
              const newDate = subtractDays(currentDate, -1);

              findFirstAvailableDate(newDate);
            }}
          >
            <KeyboardArrowRight />
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Scheduler;
