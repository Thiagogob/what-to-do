import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity'; // Sua Entidade User
import * as bcrypt from 'bcrypt'; // Instale: npm i bcrypt @types/bcrypt

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // Método para buscar um usuário por nome/email (usado na autenticação)
  async findOneByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  // NOVO: Método para criar um novo usuário
  async create(username: string, password_raw: string): Promise<User> {
    // 1. Verifica se o usuário já existe
    const existingUser = await this.findOneByUsername(username);
    if (existingUser) {
      throw new BadRequestException('Usuário já registrado.');
    }

    // 2. Criptografa a senha antes de salvar
    const salt = await bcrypt.genSalt();
    const password_hashed = await bcrypt.hash(password_raw, salt);

    // 3. Cria e salva a Entidade
    const newUser = this.usersRepository.create({
      username,
      password: password_hashed, // Salva o hash
    });
    
    return this.usersRepository.save(newUser);
  }
}