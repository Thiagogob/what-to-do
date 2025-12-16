import { MigrationInterface, QueryRunner } from "typeorm";

// O nome da classe deve corresponder ao nome do arquivo (ex: InitialSchema1765489917370)
export class InitialSchema1765489917370 implements MigrationInterface { 

    public async up(queryRunner: QueryRunner): Promise<void> {
        // --- 1. CRIAÇÃO DAS TABELAS E PKs (Chaves Primárias) ---
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS public.route_photos (
                id serial NOT NULL,
                "filePath" character varying COLLATE pg_catalog."default" NOT NULL,
                url character varying COLLATE pg_catalog."default",
                "order" integer NOT NULL DEFAULT 0,
                "routeId" integer NOT NULL,
                CONSTRAINT "PK_30a7bbe967292f906118054a6ef" PRIMARY KEY (id)
            );
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS public.routes (
                id serial NOT NULL,
                name character varying COLLATE pg_catalog."default" NOT NULL,
                description character varying COLLATE pg_catalog."default",
                "distanceKm" numeric NOT NULL,
                "elevationGainMeters" numeric,
                "uploadedAt" timestamp without time zone NOT NULL DEFAULT now(),
                slope numeric,
                duration integer,
                "originalFilePath" character varying COLLATE pg_catalog."default" NOT NULL,
                "geoJsonGeometry" text COLLATE pg_catalog."default",
                "userId" integer,
                CONSTRAINT "PK_76100511cdfa1d013c859f01d8b" PRIMARY KEY (id)
            );
        `);
        
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS public.users (
                id serial NOT NULL,
                username character varying COLLATE pg_catalog."default" NOT NULL,
                password character varying COLLATE pg_catalog."default" NOT NULL,
                "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id),
                CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE (username)
            );
        `);
        
        // --- 2. ADIÇÃO DE CHAVES ESTRANGEIRAS (FKs) ---
        
        // FK_f61a5006915dd37eb7a00dd909e: route_photos -> routes (ON DELETE CASCADE)
        await queryRunner.query(`
            ALTER TABLE IF EXISTS public.route_photos
                ADD CONSTRAINT "FK_f61a5006915dd37eb7a00dd909e" FOREIGN KEY ("routeId")
                REFERENCES public.routes (id) MATCH SIMPLE
                ON UPDATE NO ACTION
                ON DELETE CASCADE;
        `);
        
        // FK_bb4cd0199dd9a8c1438d0bff91d: routes -> users (ON DELETE NO ACTION)
        await queryRunner.query(`
            ALTER TABLE IF EXISTS public.routes
                ADD CONSTRAINT "FK_bb4cd0199dd9a8c1438d0bff91d" FOREIGN KEY ("userId")
                REFERENCES public.users (id) MATCH SIMPLE
                ON UPDATE NO ACTION
                ON DELETE NO ACTION;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // --- 1. DELEÇÃO DE FKs E TABELAS (Ordem Inversa de Dependência) ---
        // Usamos DROP TABLE IF EXISTS para garantir que não haja erro se as tabelas não existirem.
        await queryRunner.query(`DROP TABLE IF EXISTS "route_photos" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "routes" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    }
}