import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import {
   Autocomplete,
   Button,
   Container,
   Divider,
   IconButton,
   Paper,
   Stack,
   Table,
   TableBody,
   TableCell,
   TableContainer,
   TableHead,
   TableRow,
   TextField,
   Typography,
} from "@mui/material";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import { useFormik } from "formik";
import { DateTime } from "luxon";
import { ReactNode, useEffect, useState } from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import * as Yup from "yup";
import { TimeSlider } from "../components/TimeSlider";
import {
   AulaType,
   createReserva,
   deleteReserva,
   EquipamientoType,
   getAulas,
   getEquipamiento,
   getReserva,
   ReservaType,
   updateReserva,
} from "../context/api";
import { setTitle } from "../context/navbar";
import { useSnackbar } from "../context/snackbar";

import "./ReservaDetalle.css";

interface EquipamientoProps {
   id: number | string;
   cantidad: number;
   setEquipo: (id: number) => void;
   setCantidad: (cantidad: number) => void;
   opciones: ReactNode | ReactNode[];
   children?: ReactNode;
}

interface OptionType {
   id: number;
   label: string;
   availability: number;
}

function getDefaultValues(reserva: ReservaType) {
   if (!reserva) {
      return {};
   }

   return {
      aula: reserva.id,
      fecha: DateTime.fromSQL(reserva.fecha),
      desde: DateTime.fromSQL(reserva.desde),
      hasta: DateTime.fromSQL(reserva.hasta),
   };
}

// function NuevoEquipo({ id, cantidad=0, setEquipo, setCantidad, opciones=[], children=null }: EquipamientoProps) {

//    function handleCantidad(cantidad) {
//       setCantidad(cantidad < 1 ? 1 : parseInt(cantidad))
//    }

//    const mostrarAcciones = Boolean(children)

//    return (
//       <Card sx={{ padding: 1 }}>
//          <CardContent>
//             <Stack direction="row" alignItems="center" gap={2}>
//                <Autocomplete
//                   options={opciones}
//                   renderInput={(params) => <TextField {...params} label="Equipamiento" name="equipamiento" />}
//                   onChange={(e, v) => setEquipo(v.id)}
//                   fullWidth
//                   sx={{
//                      flexGrow: 1
//                   }}
//                   />
//                <TextField
//                   name="cantidad"
//                   value={cantidad}
//                   type="number"
//                   onChange={e => handleCantidad(e.target.value)}
//                   sx={{
//                      textAlign: "right",
//                      flexBasis: "4em",
//                   }}
//                />
//             </Stack>
//          </CardContent>

//          {
//             mostrarAcciones &&
//             <CardActions>
//                {children}
//             </CardActions>
//          }
//       </Card>
//    )
// }

interface BasicTableProps {
   equipamiento: { id: number; cantidad: number }[];
   setEquipamiento: (equipamiento: { id: number; cantidad: number }[]) => void;
   opciones: OptionType[];
}

export function BasicTable(
   { equipamiento, setEquipamiento, opciones }: BasicTableProps,
) {
   const opcionesDisponibles = opciones.filter((e) =>
      !equipamiento.some((e2) => e2.id == e.id)
   );
   // console.log(equipamiento)
   const [nuevoEquipamiento, setNuevoEquipamiento] = useState<
      OptionType | null
   >(null);
   const [nuevoCantidad, setNuevoCantidad] = useState(1);

   function resetNuevo() {
      setNuevoEquipamiento(null);
      setNuevoCantidad(1);
   }

   function changeEquipamiento(pos, property) {
      return (e) => {
         const value = e.target.value;
         console.log(pos, property, value);
         const copia = [...equipamiento];
         copia[pos][property] = value;
         setEquipamiento(copia);
      };
   }

   function addEquipamiento() {
      if (!nuevoEquipamiento) {
         return;
      }

      if (equipamiento.some((e) => e.id == nuevoEquipamiento.id)) {
         return;
      }

      const nuevo = [
         {
            id: nuevoEquipamiento.id,
            cantidad: nuevoCantidad,
         },
      ];

      resetNuevo();
      setEquipamiento(equipamiento.concat(nuevo));
   }

   function borrarEquipamiento(id) {
      return () => {
         setEquipamiento(equipamiento.filter((e) => e.id != id));
      };
   }

   return (
      <TableContainer component={Paper}>
         <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
               <TableRow>
                  <TableCell>Equipo</TableCell>
                  <TableCell align="right" sx={{width:"0"}}>Cantidad</TableCell>
                  <TableCell align="right" sx={{width:"0"}}>Acciones</TableCell>
               </TableRow>
            </TableHead>
            <TableBody>
               {equipamiento.map((row, i) => (
                  <TableRow
                     key={row.id}
                  >
                     <TableCell scope="row">
                        {opciones.find((e) => e.id === row.id).label}
                     </TableCell>
                     <TableCell align="right">
                        <TextField
                           type="number"
                           variant="standard"
                           slotProps={{ htmlInput: { min: 1, max: 10 } }}
                           value={row.cantidad}
                           onChange={changeEquipamiento(i, "cantidad")}
                        />
                     </TableCell>
                     <TableCell align="right">
                        <IconButton onClick={borrarEquipamiento(i)}>
                           <DeleteIcon />
                        </IconButton>
                     </TableCell>
                  </TableRow>
               ))}
               {opcionesDisponibles.length > 0 &&
                  (
                     <TableRow>
                        <TableCell component="th" scope="row">
                           <Autocomplete
                              options={opcionesDisponibles}
                              value={nuevoEquipamiento}
                              onChange={(e, v) => setNuevoEquipamiento(v)}
                              renderInput={(params) => (
                                 <TextField
                                    {...params}
                                    label="Equipamiento"
                                    name="equipamiento"
                                 />
                              )}
                              fullWidth
                              sx={{
                                 flexGrow: 1,
                              }}
                           />
                        </TableCell>
                        <TableCell align="right">
                           <TextField
                              type="number"
                              variant="standard"
                              slotProps={{ htmlInput: { min: 1, max: 10 } }}
                              value={nuevoCantidad}
                              onChange={(e) =>
                                 setNuevoCantidad(parseInt(e.target.value))}
                           />
                        </TableCell>
                        <TableCell align="right">
                           <IconButton onClick={addEquipamiento}>
                              <AddIcon />
                           </IconButton>
                        </TableCell>
                     </TableRow>
                  )}
            </TableBody>
         </Table>
      </TableContainer>
   );
}

const DisplayingErrorMessagesSchema = Yup.object().shape({
   aula: Yup.number().required("Obligatorio"),
   fecha: Yup.date().required("Obligatorio"),
   desde: Yup.date().min(DateTime.fromObject({ hour: 8 })).max(
      DateTime.fromObject({ hour: 23 }),
   ).required("Obligatorio"),
   hasta: Yup.date().min(DateTime.fromObject({ hour: 8 })).max(
      DateTime.fromObject({ hour: 23 }),
   ).required("Obligatorio"),
});

export default function ReservaDetalle() {
   setTitle("Reserva");

   const { aulas, equipamientoDisponible, reserva } = useLoaderData() as Data;
   const defaultValues = getDefaultValues(reserva);

   const [equipamiento, setEquipamiento] = useState(
      reserva?.equipamiento ?? [],
   );

   const minTime = DateTime.fromObject({ hour: 8 }),
      maxTime = DateTime.fromObject({ hour: 23 });
   const navigate = useNavigate();
   const snack = useSnackbar();

   function eliminar() {
      deleteReserva(reserva.id);
      navigate(-1);
   }

   interface AulaOptionType {
      id: number;
      label: string;
   }

   const aulaOpciones: AulaOptionType[] =
      aulas?.map((a) => ({ id: a.id, label: a.nombre })) ?? [
         {
            id: 1,
            label: "Aula 1",
         },
         {
            id: 2,
            label: "Aula 2",
         },
      ];
   const equipamientoOpciones =
      equipamientoDisponible?.map((e) => ({
         id: e.id,
         label: e.nombre,
         availability: e.cantidad,
      })) ?? [
         {
            id: 1,
            label: "Proyector",
            availability: 5,
         },
         {
            id: 2,
            label: "Pizarra",
            availability: 2,
         },
      ];

   interface FormValues {
      aula: number | null;
      fecha: DateTime | null;
      desde: DateTime | null;
      hasta: DateTime | null;
   }

   const formik = useFormik<FormValues>({
      initialValues: {
         aula: null,
         fecha: null,
         desde: null,
         hasta: null,
      },
      onSubmit: (values) => {
         const nueva: ReservaType = {
            aula: {
               id: values.aula,
            },
            fecha: (values.fecha as DateTime)?.toSQLDate(),
            desde: (values.desde as DateTime)?.toSQLTime({
               includeOffset: false,
            }),
            hasta: (values.hasta as DateTime)?.toSQLTime({
               includeOffset: false,
            }),
            equipamiento,
         };
         // alert(JSON.stringify(nueva, null, 2));
         // TODO: Separate backend logic or add mock backend

         const enviar = async () => {
            const operacion = reserva
               ? updateReserva(nueva, reserva.id)
               : createReserva(nueva);
            const result = await operacion;
            if (result.status >= 200 && result.status <= 300) {
               navigate("/reservas");
            } else {
               snack.show("Ocurrió un error");
               console.error(`Status: ${result.status}, Data:`, result.data);
            }
         };

         enviar();
      },
      validationSchema: DisplayingErrorMessagesSchema,
   });

   const tryGetTime = (time: DateTime | null) => {
      return time ? time.hour * 60 + time.minute : null;
   };

   const desde = tryGetTime(formik.values.desde);
   const hasta = tryGetTime(formik.values.hasta);

   const getDateTime = (time: number | null) => {
      return time
         ? DateTime.fromObject({
            hour: Math.floor(time / 60),
            minute: time % 60,
         })
         : null;
   };

   const sliderValue = [desde, hasta];
   const setSliderValue = ([desde, hasta]) => {
      if (desde) formik.setFieldValue("desde", getDateTime(desde));
      if (hasta) formik.setFieldValue("hasta", getDateTime(hasta));
   };

   useEffect(() => {
      console.log(formik.values);
      console.log(formik.errors);
   }, [formik.values, formik.errors]);

   const getError = (field: string) => {
      if (formik.errors[field] && formik.touched[field]) {
         return { error: true, helperText: formik.errors[field] };
      }
      return {};
   };

   const aulaError = getError("aula");
   const fechaError = getError("fecha");
   const desdeError = getError("desde");
   const hastaError = getError("hasta");

   const disabledIntervals = [[12 * 60, 13 * 60], [18 * 60, 19 * 60]];
   const disabledTimes = [[12, 13], [18, 19]].map(
      ([startHour, endHour]) => [
         DateTime.fromObject({ hour: startHour }),
         DateTime.fromObject({ hour: endHour }),
      ],
   );

   const shouldDisableTimeStart = (time: DateTime, view: any) => {
      return disabledTimes.some(([start, end]) => time >= start && time < end);
   };

   const shouldDisableTimeEnd = (time: DateTime, view: any) => {
      return disabledTimes.some(([start, end]) => time > start && time <= end);
   };

   return (
      <Container
         component="main"
         maxWidth="md"
         sx={{
            marginY: 4,
         }}
      >
         <form onSubmit={formik.handleSubmit}>
            <Stack
               id="container"
               direction="row"
               flexWrap="wrap"
               gap={1}
               justifyContent="space-between"
            >
               <Autocomplete
                  options={aulaOpciones}
                  renderInput={(params) => (
                     <TextField
                        {...params}
                        label="Aula"
                        name="aula"
                        id="aula"
                        {...aulaError}
                     />
                  )}
                  value={aulaOpciones.find(aula => aula.id === formik.values.aula) ?? null}
                  onChange={(e, v) => formik.setFieldValue("aula", v.id)}
                  onBlur={() => formik.setFieldTouched("aula", true)}
               />
               <DatePicker
                  name="fecha"
                  label="Fecha"
                  value={formik.values.fecha}
                  onChange={(v) => formik.setFieldValue("fecha", v)}
                  disablePast
                  slotProps={{
                     textField: {
                        onBlur: () => formik.setFieldTouched("fecha", true),
                        ...fechaError,
                     },
                  }}
               />
               <TimePicker
                  name="desde"
                  label="Desde"
                  minTime={minTime}
                  maxTime={maxTime}
                  minutesStep={30}
                  value={formik.values.desde}
                  onChange={(v) => {
                     formik.setFieldValue("desde", v);
                  }}
                  shouldDisableTime={shouldDisableTimeStart}
                  slotProps={{
                     textField: {
                        onBlur: () => formik.setFieldTouched("desde", true),
                        ...desdeError,
                     },
                  }}
                  sx={{
                     width: 1,
                     marginY: 1,
                  }}
               />
               <TimePicker
                  name="hasta"
                  label="Hasta"
                  minTime={minTime}
                  maxTime={maxTime}
                  minutesStep={30}
                  value={formik.values.hasta}
                  onChange={(v) => {
                     formik.setFieldValue("hasta", v);
                  }}
                  shouldDisableTime={shouldDisableTimeEnd}
                  slotProps={{
                     textField: {
                        onBlur: () => formik.setFieldTouched("hasta", true),
                        ...hastaError,
                     },
                  }}
                  sx={{
                     width: 1,
                     marginY: 1,
                  }}
               />
               <TimeSlider
                  value={sliderValue}
                  onChange={setSliderValue}
                  min={8 * 60}
                  max={23 * 60}
                  step={30}
                  disabledIntervals={disabledIntervals}
               />
               <Paper id="equipamiento">
                  <Typography marginBottom={1}>Equipamiento</Typography>
                  <Stack gap={1}>
                     {
                        /* {equipamiento.length == 0 ? <Typography align="center">Ninguno</Typography> :
                     equipamiento.map((e, i) =>
                        <Equipo
                           key={e.id}
                           setEquipo={changeEquipamiento(i, "equipamiento")}
                           setCantidad={changeEquipamiento(i, "cantidad")}
                           opciones={equipamientoOpciones}
                           {...e}
                           >
                           <Button color="error" onClick={borrarEquipamiento(e.id)}>Quitar</Button>
                        </Equipo>
                     )} */
                     }
                     <BasicTable
                        equipamiento={equipamiento}
                        setEquipamiento={setEquipamiento}
                        opciones={equipamientoOpciones}
                     />
                  </Stack>
                  <Divider sx={{ marginY: 2 }} />
                  {
                     /* <NuevoEquipo
                     id={nuevoEquipamiento}
                     cantidad={nuevoCantidad}
                     setEquipo={e => setNuevoEquipamiento(e)}
                     setCantidad={setNuevoCantidad}
                     opciones={equipamientoOpciones}
                     >
                     <Button onClick={addEquipamiento}>Agregar</Button>
                  </NuevoEquipo> */
                  }
               </Paper>
               <Button
                  variant="contained"
                  type="submit"
                  fullWidth
                  sx={{ marginTop: 1 }}
               >
                  Guardar
               </Button>
               <Button
                  variant="contained"
                  color="error"
                  onClick={eliminar}
                  fullWidth
                  sx={{ marginTop: 1 }}
               >
                  Eliminar
               </Button>
               {/* </Formik> */}
            </Stack>
         </form>
      </Container>
   );
}

interface Data {
   aulas: AulaType[];
   equipamientoDisponible: EquipamientoType[];
   reserva: ReservaType;
}

export async function reservarLoader({ params }): Promise<Data> {
   const aulas = await getAulas();
   const equipamientoDisponible = await getEquipamiento();
   const reserva = params.id ? await getReserva(params.id) : null;
   return {
      aulas: aulas?.data,
      equipamientoDisponible: equipamientoDisponible?.data,
      reserva: reserva?.data,
   };
}
