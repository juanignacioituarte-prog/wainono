-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Farm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "provider" TEXT NOT NULL DEFAULT 'GOOGLE',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmUser" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',

    CONSTRAINT "FarmUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paddock" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "boundary" TEXT NOT NULL,

    CONSTRAINT "Paddock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastureRecord" (
    "id" TEXT NOT NULL,
    "paddockId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "cover" DOUBLE PRECISION,
    "ndvi" DOUBLE PRECISION,
    "growthRate" DOUBLE PRECISION,
    "type" TEXT NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "PastureRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedSetting" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "FeedSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Break" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "paddockId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vertices" TEXT NOT NULL,
    "areaHa" DOUBLE PRECISION NOT NULL,
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "cropMode" TEXT NOT NULL,
    "isCropBreak" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Break_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HS_Staff" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "HS_Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HS_Hazard" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "mitigation" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportedBy" TEXT,

    CONSTRAINT "HS_Hazard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HS_Meeting" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "topic" TEXT NOT NULL,
    "attendees" TEXT NOT NULL,

    CONSTRAINT "HS_Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HS_Observation" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observer" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "HS_Observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HS_Incident" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "HS_Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_service',
    "oosReason" TEXT,
    "lastService" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "performedBy" TEXT NOT NULL,
    "checkedPoints" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sensor" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "macAddress" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sensor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorReading" (
    "id" TEXT NOT NULL,
    "sensorId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" TEXT NOT NULL,

    CONSTRAINT "SensorReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaddockExclusion" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "paddockName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "PaddockExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaddockPartial" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "paddockName" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "PaddockPartial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calibration" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "paddockName" TEXT NOT NULL,
    "measuredCover" DOUBLE PRECISION,
    "date" TIMESTAMP(3),

    CONSTRAINT "Calibration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualMode" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "paddockName" TEXT NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "ManualMode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FarmUser_farmId_userId_key" ON "FarmUser"("farmId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedSetting_farmId_key_key" ON "FeedSetting"("farmId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Sensor_macAddress_key" ON "Sensor"("macAddress");

-- CreateIndex
CREATE UNIQUE INDEX "PaddockExclusion_farmId_paddockName_key" ON "PaddockExclusion"("farmId", "paddockName");

-- CreateIndex
CREATE UNIQUE INDEX "PaddockPartial_farmId_paddockName_key" ON "PaddockPartial"("farmId", "paddockName");

-- CreateIndex
CREATE UNIQUE INDEX "Calibration_farmId_paddockName_key" ON "Calibration"("farmId", "paddockName");

-- CreateIndex
CREATE UNIQUE INDEX "ManualMode_farmId_key" ON "ManualMode"("farmId");

-- AddForeignKey
ALTER TABLE "FarmUser" ADD CONSTRAINT "FarmUser_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmUser" ADD CONSTRAINT "FarmUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paddock" ADD CONSTRAINT "Paddock_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastureRecord" ADD CONSTRAINT "PastureRecord_paddockId_fkey" FOREIGN KEY ("paddockId") REFERENCES "Paddock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedSetting" ADD CONSTRAINT "FeedSetting_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Break" ADD CONSTRAINT "Break_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Break" ADD CONSTRAINT "Break_paddockId_fkey" FOREIGN KEY ("paddockId") REFERENCES "Paddock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HS_Staff" ADD CONSTRAINT "HS_Staff_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HS_Hazard" ADD CONSTRAINT "HS_Hazard_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HS_Meeting" ADD CONSTRAINT "HS_Meeting_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HS_Observation" ADD CONSTRAINT "HS_Observation_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HS_Incident" ADD CONSTRAINT "HS_Incident_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sensor" ADD CONSTRAINT "Sensor_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorReading" ADD CONSTRAINT "SensorReading_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaddockExclusion" ADD CONSTRAINT "PaddockExclusion_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaddockPartial" ADD CONSTRAINT "PaddockPartial_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calibration" ADD CONSTRAINT "Calibration_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualMode" ADD CONSTRAINT "ManualMode_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

