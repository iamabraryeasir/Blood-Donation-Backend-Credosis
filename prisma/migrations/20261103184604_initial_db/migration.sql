-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'FULFILLED');

-- CreateEnum
CREATE TYPE "UrgencyLevel" AS ENUM ('NORMAL', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG');

-- CreateEnum
CREATE TYPE "ResponseStatus" AS ENUM ('INTERESTED', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "BloodRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "bloodGroup" "BloodGroup" NOT NULL,
    "unitsNeeded" INTEGER NOT NULL DEFAULT 1,
    "hospitalName" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "urgency" "UrgencyLevel" NOT NULL DEFAULT 'NORMAL',
    "neededAt" TIMESTAMP(3) NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "additionalNotes" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BloodRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationResponse" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "status" "ResponseStatus" NOT NULL DEFAULT 'INTERESTED',
    "donorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonationResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bloodGroup" "BloodGroup" NOT NULL,
    "phone" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "lastDonationDate" TIMESTAMP(3),
    "isAvailableForDonation" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isProfileComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BloodRequest_status_bloodGroup_district_idx" ON "BloodRequest"("status", "bloodGroup", "district");

-- CreateIndex
CREATE INDEX "BloodRequest_neededAt_idx" ON "BloodRequest"("neededAt");

-- CreateIndex
CREATE INDEX "DonationResponse_requestId_status_idx" ON "DonationResponse"("requestId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DonationResponse_requestId_donorId_key" ON "DonationResponse"("requestId", "donorId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_phone_key" ON "Profile"("phone");

-- CreateIndex
CREATE INDEX "Profile_bloodGroup_district_isAvailableForDonation_idx" ON "Profile"("bloodGroup", "district", "isAvailableForDonation");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "BloodRequest" ADD CONSTRAINT "BloodRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationResponse" ADD CONSTRAINT "DonationResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BloodRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationResponse" ADD CONSTRAINT "DonationResponse_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
