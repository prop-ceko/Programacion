import { ReservaEquipamientoType } from "../context/api";

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

export interface ReservaRepository {
    get(id: number): ReservaType;
    getAll(): ReservaType[];
    add(reserva: ReservaType): void;
    update(reserva: ReservaType): void;
    delete(id: number): void;
}
