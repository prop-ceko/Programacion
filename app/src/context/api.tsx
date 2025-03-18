import axios, { AxiosError, AxiosResponse } from "axios"
import { createContext, useContext } from "react"
import { createState } from "state-pool"

const baseURL = "http://127.0.0.1:8000/api"

declare interface Credentials {
    token: string,
    expiry?: string
}

export interface EquipamientoType {
    id: number
    nombre: string
    cantidad: number
}

export interface AulaType {
    id: number
    nombre: string
    equipamiento: any[]
    disponible: boolean
}

export interface ReservaEquipamientoType {
    id: number
    nombre?: string
    cantidad: number
}

export interface ReservaType {
    id?: number
    aula: {
        id: number
        nombre?: string
    },
    fecha: string,
    desde: string,
    hasta: string,
    equipamiento: ReservaEquipamientoType[]
}

declare interface TokenInfoType {
    expiry: string
    valid: boolean
}


function saveCredentials(credentials: Credentials) {
    localStorage.setItem("auth", JSON.stringify(credentials))
}

function loadCredentials() : Credentials {
    try {
        return JSON.parse(localStorage.getItem('auth'))
    } catch {
        return null
    }
}

function isTokenValid(credentials: Credentials) {
    const now = new Date()
    const then = new Date(credentials?.expiry)
    return credentials && then > now
}

function setCredentials(newValue: Credentials) {
    credentials = newValue
    saveCredentials(credentials)
}

function clearCredentials() {
    credentials = null
    localStorage.removeItem("auth")
}

let credentials = loadCredentials()
const globalAuth = createState(isTokenValid(credentials))

const axiosInstance = axios.create({
    baseURL
})

const axiosPublic = axios.create({
    baseURL
})

axiosInstance.interceptors.request.use(async req => {
    req.headers.Authorization = `Token ${credentials.token}`
    return req
})

axiosInstance.interceptors.response.use(async res => {
    if (!globalAuth.getValue())
        return res

    await refreshTokenInfo()

    return res
}, error => {
    if (error.response?.status == 401)
        globalAuth.setValue(false)
    return Promise.reject(error)
})

async function refreshTokenInfo() {
    const info = await getTokenInfo(credentials.token)
    setCredentials({
        ...credentials,
        expiry: info.expiry
    })
}

async function getTokenInfo(token) : Promise<TokenInfoType> {
    const {data} = await axiosPublic.post("/token/", {
        token
    })
    // , {
        // withCredentials: true,
        // headers: {
        //     'X-CSRFToken': Cookies.get('csrftoken')
        // }
    // })
    return data
}

export async function login(email, password) {
    if (globalAuth.getValue())
        return false

    const result =  await axiosPublic.post("/login/", {
        email,
        password
    })

    if (result.status == 200) // Ok
    {
        setCredentials(result.data)
        globalAuth.setValue(true)
        return true
    }
    return false
}

export async function logout() {
    if (!globalAuth.getValue())
        return

    const result = await axiosInstance.post("/logout/")
    if (result.status == 204) // No content
    {
        clearCredentials()
        globalAuth.setValue(false)
    }
}

export async function register(nombre, apellido, dni, email, password) {
    return await axiosPublic.post("/registro/", {
        nombre,
        apellido,
        dni,
        email,
        password
    })
}

interface Response<T> {
    status: number,
    data: T
}

export async function makeRequest<T>(request : () => Promise<AxiosResponse>): Promise<Response<T>> {
    if (!globalAuth.getValue())
        return null

    let response;
    try {
        response = await request()
        const {status, data} = response
        return {status, data}
    } catch (error) {
        const {status, data} = error.response ?? {}
        return {status, data}
    }
}

function get<T>(endpoint: string | ((id: number) => string)) {
    return (id = 0) => {
        const url = typeof endpoint === "function" ? endpoint(id) : endpoint
        return makeRequest<T>(() => axiosInstance.get(url))
    }
}

function post<T>(endpoint: string) {
    return (data: T) => {
        const url = endpoint
        return makeRequest<T>(() => axiosInstance.post(url, data))
    }
}

function patch<T>(endpoint: (id: number) => string) {
    return (data: T, id: number) => {
        const url = endpoint(id)
        return makeRequest<T>(() => axiosInstance.patch(url, data))
    }
}

function remove<T>(endpoint: (id: number) => string) {
    return (id: number) => {
        const url = endpoint(id)
        return makeRequest<T>(() => axiosInstance.delete(url))
    }
}

export const getAulas = get<AulaType[]>("/aulas/")
export const getEquipamiento = get<EquipamientoType[]>("/equipamiento/")
export const getReservas = get<ReservaType[]>("/reservas/")
export const getReserva = get<ReservaType>(id => `/reservas/${id}/`)

export const createReserva = post<ReservaType>("/reservas/")
export const updateReserva = patch<ReservaType>(id => `/reservas/${id}/`)
export const deleteReserva = remove<ReservaType>(id => `/reservas/${id}/`)

export declare interface AuthData {
    auth?: boolean
    login?: (email, password) => Promise<boolean>
    logout?: () => Promise<void>
}

const AuthContext: React.Context<AuthData> = createContext(null)

export const AuthProvider = ({children} : { children: React.ReactNode }) => {
    const [auth, ] = globalAuth.useState()

    const data = {
        auth: 'true',
        login,
        logout
    }

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
