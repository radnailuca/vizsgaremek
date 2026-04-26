-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 25, 2026 at 01:45 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `bpmap`
--
CREATE DATABASE IF NOT EXISTS bpmap
CHARACTER SET utf8mb4
COLLATE utf8mb4_hungarian_ci;

USE bpmap;

-- --------------------------------------------------------

--
-- Table structure for table `felhasznalo`
--

CREATE TABLE `felhasznalo` (
  `ID` int(11) NOT NULL,
  `Email` varchar(255) NOT NULL,
  `Jelszo` varchar(255) NOT NULL COMMENT 'bcrypt jelszó-hash (nem plain text)',
  `szerep` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT 'user',
  `jelszo_kerveny` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_hungarian_ci;

-- --------------------------------------------------------

--
-- Table structure for table `felhasznalo_hely`
--

CREATE TABLE `felhasznalo_hely` (
  `ID` int(11) NOT NULL,
  `felhasznaloID` int(11) NOT NULL,
  `placeID` varchar(255) NOT NULL,
  `elso_talalat` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_hungarian_ci;

-- --------------------------------------------------------

--
-- Table structure for table `log`
--

CREATE TABLE `log` (
  `ID` int(11) NOT NULL,
  `felhasznaloID` int(11) NOT NULL,
  `helyNev` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_hungarian_ci;

-- --------------------------------------------------------

--
-- Table structure for table `statisztika_napi`
--

CREATE TABLE `statisztika_napi` (
  `ID` int(11) NOT NULL,
  `felhasznaloID` int(11) NOT NULL,
  `datum` date NOT NULL DEFAULT curdate(),
  `kereses_db` int(11) NOT NULL DEFAULT 0,
  `uj_hely_db` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_hungarian_ci;

-- --------------------------------------------------------

--
-- Table structure for table `statisztika_tipus`
--

CREATE TABLE `statisztika_tipus` (
  `ID` int(11) NOT NULL,
  `felhasznaloID` int(11) NOT NULL,
  `helytipus` varchar(100) NOT NULL,
  `kereses_db` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_hungarian_ci;

-- --------------------------------------------------------

--
-- Table structure for table `admin_log`
--

CREATE TABLE `admin_log` (
  `ID` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `admin_email` varchar(255) NOT NULL,
  `muvelet` varchar(100) NOT NULL,
  `torolt_id` int(11) DEFAULT NULL,
  `torolt_email` varchar(255) NOT NULL,
  `torles_datuma` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_hungarian_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `felhasznalo`
--
ALTER TABLE `felhasznalo`
  ADD PRIMARY KEY (`ID`),
  ADD UNIQUE KEY `Email` (`Email`);

--
-- Indexes for table `felhasznalo_hely`
--
ALTER TABLE `felhasznalo_hely`
  ADD PRIMARY KEY (`ID`),
  ADD UNIQUE KEY `uq_felhasznalo_place` (`felhasznaloID`,`placeID`);

--
-- Indexes for table `log`
--
ALTER TABLE `log`
  ADD PRIMARY KEY (`ID`),
  ADD KEY `idx_log_felhasznaloID` (`felhasznaloID`);

--
-- Indexes for table `statisztika_napi`
--
ALTER TABLE `statisztika_napi`
  ADD PRIMARY KEY (`ID`),
  ADD UNIQUE KEY `uq_statnapi_user_datum` (`felhasznaloID`,`datum`),
  ADD KEY `fk_statnapi_felhasznalo` (`felhasznaloID`);

--
-- Indexes for table `statisztika_tipus`
--
ALTER TABLE `statisztika_tipus`
  ADD PRIMARY KEY (`ID`),
  ADD UNIQUE KEY `uq_felhasznalo_helytipus` (`felhasznaloID`,`helytipus`);

--
-- Indexes for table `admin_log`
--
ALTER TABLE `admin_log`
  ADD PRIMARY KEY (`ID`),
  ADD KEY `idx_admin_log_admin_id` (`admin_id`),
  ADD KEY `idx_admin_log_torolt_id` (`torolt_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `felhasznalo`
--
ALTER TABLE `felhasznalo`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `felhasznalo_hely`
--
ALTER TABLE `felhasznalo_hely`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=57;

--
-- AUTO_INCREMENT for table `log`
--
ALTER TABLE `log`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `statisztika_napi`
--
ALTER TABLE `statisztika_napi`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=56;

--
-- AUTO_INCREMENT for table `statisztika_tipus`
--
ALTER TABLE `statisztika_tipus`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `admin_log`
--
ALTER TABLE `admin_log`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `felhasznalo_hely`
--
ALTER TABLE `felhasznalo_hely`
  ADD CONSTRAINT `fk_felhely_felhasznalo` FOREIGN KEY (`felhasznaloID`) REFERENCES `felhasznalo` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `log`
--
ALTER TABLE `log`
  ADD CONSTRAINT `fk_log_felhasznalo` FOREIGN KEY (`felhasznaloID`) REFERENCES `felhasznalo` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `statisztika_napi`
--
ALTER TABLE `statisztika_napi`
  ADD CONSTRAINT `fk_statnapi_felhasznalo` FOREIGN KEY (`felhasznaloID`) REFERENCES `felhasznalo` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `statisztika_tipus`
--
ALTER TABLE `statisztika_tipus`
  ADD CONSTRAINT `fk_stattipus_felhasznalo` FOREIGN KEY (`felhasznaloID`) REFERENCES `felhasznalo` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `admin_log`
--
ALTER TABLE `admin_log`
  ADD CONSTRAINT `fk_adminlog_admin_id` FOREIGN KEY (`admin_id`) REFERENCES `felhasznalo` (`ID`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_adminlog_torolt_id` FOREIGN KEY (`torolt_id`) REFERENCES `felhasznalo` (`ID`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
