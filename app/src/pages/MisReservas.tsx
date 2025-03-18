import { Card, CardActions, CardContent, Divider, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import { useLoaderData } from 'react-router-dom';
import { ReservaType, deleteReserva, getReservas } from '../context/api';
import { setTitle } from '../context/navbar';
import { useState } from 'react';


interface EquipamientoProps {
   nombre: string
   cantidad: number
}

interface ReservaProps  extends ReservaType{
   eliminar: () => void
}

function Equipamiento({nombre, cantidad}: EquipamientoProps) {
   return (
      <TableRow>
         <TableCell>{nombre}</TableCell>
         <TableCell align="right">{cantidad}</TableCell>
      </TableRow>
   )
}

function Reserva({ id=-1, aula, fecha, desde, hasta, equipamiento, eliminar }: ReservaProps ) {

   return (
      <Card>
         <CardContent>
            <Typography fontWeight="600">{aula.nombre}</Typography>
            <Divider sx={{ my: 1 }} />
            <Stack direction="row" justifyContent='space-between'>
               <Typography>Fecha</Typography>
               <Typography>{fecha}</Typography>
            </Stack>
            <Stack direction="row" justifyContent='space-between'>
               <Typography>Desde</Typography>
               <Typography>{desde}</Typography>
            </Stack>
            <Stack direction="row" justifyContent='space-between'>
               <Typography>Hasta</Typography>
               <Typography>{hasta}</Typography>
            </Stack>
            {
               equipamiento?.length > 0 &&
               <TableContainer component={Paper}>
                  <Table>
                     <TableHead>
                        <TableRow>
                           <TableCell>Equipamiento</TableCell>
                           <TableCell align="right">Cantidad</TableCell>
                        </TableRow>
                     </TableHead>
                     <TableBody>
                        {equipamiento.map(e => {
                           return <Equipamiento key={e.id} nombre={e.nombre} cantidad={e.cantidad}/>
                        })}
                     </TableBody>
                  </Table>
               </TableContainer>
            }
         </CardContent>
         <CardActions sx={{mx: 1, mb: 1, gap:1}}>
            <Button href={`${id}`}>Editar</Button>
            <Button color="error" onClick={eliminar}>Eliminar</Button>
         </CardActions>
      </Card>
   )
}

export default function MisReservas() {
   setTitle("Mis Reservas")
   const [reservas, setReservas] = useState(useLoaderData() as Data)

   function eliminarReserva(id) {
      return () => {
         deleteReserva(id)
         setReservas(reservas.filter(r => r.id !== id))
      }
   }

   return (
      <Container component="main" maxWidth="xs" sx={{
         marginY: 4,
         display: 'flex',
         flexDirection: 'column',
         alignItems: 'center'
      }}>
         <Button variant="contained" href='/reservas/nuevo' fullWidth>Nueva reserva</Button>
         {
            (reservas?.length ?? 0) == 0 ? <>No hay reservas</> :
            <Stack direction="column" gap={2} width={1} marginTop={1}>
               {
                  reservas.map(reserva =>
                     <Reserva key={reserva.id} eliminar={eliminarReserva(reserva.id)} {...reserva}/>
                  )
               }
            </Stack>
         }
      </Container>
   );
}

type Data = ReservaType[]

export async function misReservasLoader(): Promise<Data> {
   const reservas = await getReservas()
   return reservas?.data
}
