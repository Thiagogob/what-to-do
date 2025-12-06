import { Exclude } from 'class-transformer';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users') //  1. Define o nome da tabela no DB como 'users'
export class User {
  
  @PrimaryGeneratedColumn() //  2. Coluna ID, chave primária e autoincrementável
  id: number;

  @Column({ unique: true }) //  3. Coluna de login, com restrição de valor único
  username: string; // Ou 'email', se você usar e-mail para login

  @Exclude()
  @Column() //  4. Coluna para o hash da senha
  password: string;

  // Opcional: Para controle de data
  @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}