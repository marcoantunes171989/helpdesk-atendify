-- CreateTable agenda_visitas
CREATE TABLE "agenda_visitas" (
    "id"        TEXT        NOT NULL,
    "tecnico"   TEXT        NOT NULL,
    "cliente"   TEXT        NOT NULL,
    "tipo"      TEXT,
    "data"      TEXT,
    "mes"       TEXT,
    "obs"       TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agenda_visitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable agenda_plantoes
CREATE TABLE "agenda_plantoes" (
    "id"        TEXT        NOT NULL,
    "data"      TEXT,
    "tecnico"   TEXT        NOT NULL,
    "tipo"      TEXT,
    "aba"       TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agenda_plantoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable agenda_ferias
CREATE TABLE "agenda_ferias" (
    "id"          TEXT        NOT NULL,
    "colaborador" TEXT        NOT NULL,
    "mes"         TEXT,
    "periodo"     TEXT,
    "tipo"        TEXT,
    "equipe"      TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agenda_ferias_pkey" PRIMARY KEY ("id")
);

-- CreateTable agenda_tecnicos
CREATE TABLE "agenda_tecnicos" (
    "id"         TEXT        NOT NULL,
    "nome"       TEXT        NOT NULL,
    "equipe"     TEXT,
    "modalidade" TEXT,
    "horario"    TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agenda_tecnicos_pkey" PRIMARY KEY ("id")
);
