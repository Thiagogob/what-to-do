import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

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
  @Column({ type: 'simple-json', nullable: true}) 
  geoJsonGeometry: any;
  
  @Column() // 💡 NOVO: Caminho do arquivo GPX no disco
  originalFilePath: string;

  @CreateDateColumn({default: () => 'CURRENT_TIMESTAMP' })
  uploadedAt: Date;

  @Column({ name: 'userId', nullable: true }) // Nome da coluna no DB
  userId: number;

  // 2. Relação Many-to-One: Muitas Rotas para Um Usuário
  @ManyToOne(() => User, user => user.routes)
  @JoinColumn({ name: 'userId' }) // Indica qual coluna armazena a FK
  user: User; // Propriedade de relação TypeORM
}