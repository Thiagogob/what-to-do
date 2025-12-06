import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('routes')
export class Route {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('decimal')
  distanceKm: number;

  @Column('decimal', { nullable: true })
  elevationGainMeters: number;

  @Column({ nullable: true })
  duration: number;

  @Column('decimal', { nullable: true })
  slope: number;

  // Armazena a geometria da rota em formato GeoJSON
  @Column({ type: 'jsonb', nullable: true}) 
  geoJsonGeometry: any;
  
  @Column() // 💡 NOVO: Caminho do arquivo GPX no disco
  originalFilePath: string;

  @CreateDateColumn({default: () => 'CURRENT_TIMESTAMP' })
  uploadedAt: Date;
}