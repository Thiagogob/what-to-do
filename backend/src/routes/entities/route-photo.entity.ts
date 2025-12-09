// src/routes/entities/route-photo.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Route } from './route.entity'; // Importa a Entidade Rota

@Entity('route_photos')
export class RoutePhoto {
    @PrimaryGeneratedColumn()
    id: number;

    // Caminho no disco para a imagem
    @Column()
    filePath: string;

    // URL acessível (ex: /assets/photos/...)
    @Column({ nullable: true }) 
    url: string; 

    // Ordem de exibição da foto (opcional)
    @Column({ default: 0 }) 
    order: number;

    // ----------------------------------------------------
    // RELAÇÃO COM A ROTA (FK)
    // ----------------------------------------------------
    @ManyToOne(() => Route, route => route.photos, { onDelete: 'CASCADE' }) // Se a rota for deletada, a foto também é
    @JoinColumn({ name: 'routeId' })
    route: Route;

    @Column() // Chave estrangeira bruta
    routeId: number;
}