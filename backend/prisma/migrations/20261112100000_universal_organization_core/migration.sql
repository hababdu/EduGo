-- Universal organization core: additive migration, existing organization rows remain intact.
CREATE TABLE "OrganizationType" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "nameUz" TEXT NOT NULL,
  "nameRu" TEXT,
  "nameEn" TEXT,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrganizationType_slug_key" ON "OrganizationType"("slug");
CREATE INDEX "OrganizationType_isActive_sortOrder_idx" ON "OrganizationType"("isActive", "sortOrder");

CREATE TABLE "EducationDirection" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "nameUz" TEXT NOT NULL,
  "nameRu" TEXT,
  "nameEn" TEXT,
  "category" TEXT,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EducationDirection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EducationDirection_slug_key" ON "EducationDirection"("slug");
CREATE INDEX "EducationDirection_isActive_sortOrder_idx" ON "EducationDirection"("isActive", "sortOrder");

CREATE TABLE "OrganizationDirection" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "directionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationDirection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrganizationDirection_organizationId_directionId_key" ON "OrganizationDirection"("organizationId", "directionId");
CREATE INDEX "OrganizationDirection_directionId_idx" ON "OrganizationDirection"("directionId");
ALTER TABLE "OrganizationDirection" ADD CONSTRAINT "OrganizationDirection_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationDirection" ADD CONSTRAINT "OrganizationDirection_directionId_fkey"
  FOREIGN KEY ("directionId") REFERENCES "EducationDirection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "OrganizationBranch" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "address" TEXT,
  "city" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "isMain" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationBranch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrganizationBranch_organizationId_code_key" ON "OrganizationBranch"("organizationId", "code");
CREATE INDEX "OrganizationBranch_organizationId_isActive_idx" ON "OrganizationBranch"("organizationId", "isActive");
ALTER TABLE "OrganizationBranch" ADD CONSTRAINT "OrganizationBranch_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Organization" ADD COLUMN "typeId" TEXT;
CREATE INDEX "Organization_typeId_idx" ON "Organization"("typeId");
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_typeId_fkey"
  FOREIGN KEY ("typeId") REFERENCES "OrganizationType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed editable, non-exhaustive organization types.
INSERT INTO "OrganizationType" ("id","slug","nameUz","nameEn","sortOrder","updatedAt") VALUES
('orgtype_school','school','Umumta’lim maktabi','School',10,CURRENT_TIMESTAMP),
('orgtype_preschool','preschool','Maktabgacha ta’lim','Preschool',20,CURRENT_TIMESTAMP),
('orgtype_university','university','Universitet yoki institut','University / Institute',30,CURRENT_TIMESTAMP),
('orgtype_college','college','Kollej yoki texnikum','College / Technical school',40,CURRENT_TIMESTAMP),
('orgtype_training_center','training-center','O‘quv markazi','Training center',50,CURRENT_TIMESTAMP),
('orgtype_language_center','language-center','Til markazi','Language center',60,CURRENT_TIMESTAMP),
('orgtype_it_academy','it-academy','IT akademiya','IT academy',70,CURRENT_TIMESTAMP),
('orgtype_sports_club','sports-club','Sport klubi yoki akademiyasi','Sports club / academy',80,CURRENT_TIMESTAMP),
('orgtype_art_studio','art-studio','San’at yoki ijod studiyasi','Art / creative studio',90,CURRENT_TIMESTAMP),
('orgtype_vocational','vocational','Kasb-hunar markazi','Vocational center',100,CURRENT_TIMESTAMP),
('orgtype_corporate','corporate-academy','Korporativ akademiya','Corporate academy',110,CURRENT_TIMESTAMP),
('orgtype_online','online-academy','Onlayn akademiya','Online academy',120,CURRENT_TIMESTAMP),
('orgtype_tutor','independent-tutor','Mustaqil repetitor yoki mentor','Independent tutor / mentor',130,CURRENT_TIMESTAMP),
('orgtype_club','learning-club','O‘quv klubi yoki to‘garak','Learning club',140,CURRENT_TIMESTAMP),
('orgtype_other','other','Boshqa ta’lim tashkiloti','Other education provider',999,CURRENT_TIMESTAMP);

-- Broad starter directions. New directions can be added without schema changes.
INSERT INTO "EducationDirection" ("id","slug","nameUz","nameEn","category","sortOrder","updatedAt") VALUES
('dir_preschool','early-childhood','Erta rivojlanish va maktabgacha ta’lim','Early childhood','general',10,CURRENT_TIMESTAMP),
('dir_general','general-education','Umumiy ta’lim fanlari','General education','general',20,CURRENT_TIMESTAMP),
('dir_higher','higher-education','Oliy va akademik ta’lim','Higher education','academic',30,CURRENT_TIMESTAMP),
('dir_vocational','vocational-skills','Kasbiy va texnik ko‘nikmalar','Vocational skills','professional',40,CURRENT_TIMESTAMP),
('dir_languages','languages','Xorijiy tillar','Languages','academic',50,CURRENT_TIMESTAMP),
('dir_exam','exam-preparation','Imtihonlarga tayyorlov','Exam preparation','academic',60,CURRENT_TIMESTAMP),
('dir_it','it-technology','IT va raqamli texnologiyalar','IT and digital technology','technology',70,CURRENT_TIMESTAMP),
('dir_engineering','engineering','Muhandislik va robototexnika','Engineering and robotics','technology',80,CURRENT_TIMESTAMP),
('dir_art','arts-design','San’at, musiqa va dizayn','Arts, music and design','creative',90,CURRENT_TIMESTAMP),
('dir_sport','sports','Sport va jismoniy rivojlanish','Sports and fitness','sports',100,CURRENT_TIMESTAMP),
('dir_business','business','Biznes, moliya va boshqaruv','Business and management','professional',110,CURRENT_TIMESTAMP),
('dir_driving','driving','Haydovchilik va transport','Driving and transport','professional',120,CURRENT_TIMESTAMP),
('dir_health','healthcare','Tibbiyot va sog‘liq bo‘yicha ta’lim','Healthcare education','professional',130,CURRENT_TIMESTAMP),
('dir_psychology','psychology','Psixologiya va shaxsiy rivojlanish','Psychology and personal development','personal',140,CURRENT_TIMESTAMP),
('dir_inclusive','inclusive-education','Inklyuziv va maxsus ta’lim','Inclusive education','general',150,CURRENT_TIMESTAMP),
('dir_agriculture','agriculture','Qishloq xo‘jaligi va ekologiya','Agriculture and ecology','professional',160,CURRENT_TIMESTAMP),
('dir_tourism','tourism-service','Turizm va xizmat ko‘rsatish','Tourism and hospitality','professional',170,CURRENT_TIMESTAMP),
('dir_religious','religious-studies','Diniy ta’lim','Religious studies','academic',180,CURRENT_TIMESTAMP),
('dir_corporate','corporate-learning','Korporativ va xodimlar ta’limi','Corporate learning','professional',190,CURRENT_TIMESTAMP),
('dir_mentoring','mentoring','Repetitorlik, mentorlik va treninglar','Tutoring, mentoring and workshops','personal',200,CURRENT_TIMESTAMP),
('dir_other','other','Boshqa yoki maxsus yo‘nalish','Other / custom direction','other',999,CURRENT_TIMESTAMP);
