import { ReservaRepository, ReservaType } from "../base";

class LocalStorage implements ReservaRepository {
    reservas: ReservaType[]

    constructor() {
        this.reservas = JSON.parse(localStorage.getItem("reservas")) || []
    }

    get(id: number) {
        return this.reservas.find(reserva => reserva.id === id)
    }

    getAll() {
        return this.reservas
    }

    add(reserva: any) {
        this.reservas.push(reserva)
        localStorage.setItem("reservas", JSON.stringify(this.reservas))
    }

    update(reserva: any) {
        const index = this.reservas.findIndex(r => r.id === reserva.id)
        this.reservas[index] = reserva
        localStorage.setItem("reservas", JSON.stringify(this.reservas))
    }

    delete(id: number) {
        this.reservas = this.reservas.filter(reserva => reserva.id !== id)
        localStorage.setItem("reservas", JSON.stringify(this.reservas))
    }
}
