import { Stack } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import { Form, Navigate, useNavigate, useNavigation } from 'react-router-dom'
import { useAuth } from '../context/api';


export default function Login() {
   const {login} = useAuth()
   const navigate = useNavigate()

   const handleSubmit = (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      login(data.get('email'), data.get('password')).then(() => navigate("/reservas"))
   };

   return (

      <Container component="main" maxWidth="xs" sx={{
         paddingX: 4,
         marginTop: 4,
         display: 'flex',
         flexDirection: 'column',
         alignItems: 'center'
      }}>
         <Box component={Form} onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            <TextField
               label="Correo electrónico"
               id="email"
               name="email"
               type="email"
               autoComplete="email"
               autoFocus
               fullWidth
               required
            />
            <TextField
               margin="normal"
               label="Contraseña"
               name="password"
               type="password"
               id="password"
               autoComplete="password"
               fullWidth
               required
            />
            <Button
               type="submit"
               fullWidth
               variant="contained"
               sx={{ mt: 3, mb: 2 }}
            >
               Continuar
            </Button>
            {/* <Button
               type="submit"
               fullWidth
               variant="contained"
            >
               Continuar con Google
            </Button> */}
            <Stack direction="column" alignItems="center" mt={4} gap={1} >
               <Grid item>
                  <Link href="/recover_password" variant="body2">
                     Olvidé mi contraseña
                  </Link>
               </Grid>
               <Grid item>
                  <Link href="/register" variant="body2">
                     Registrarme
                  </Link>
               </Grid>
               <Grid item>
                  <Link href="/temporal_register" variant="body2">
                     No pertenezco a la institución
                  </Link>
               </Grid>
            </Stack>
         </Box>
      </Container>
   );
}
