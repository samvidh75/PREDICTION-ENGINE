@echo off
cd /d C:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE\src\stockstory
echo === Files importing PercentileEngine ===
findstr /s /i "PercentileEngine" *.ts engines\*.ts scoring\*.ts analytics\*.ts sectors\*.ts
echo.
echo === Files importing SectorPercentileEngine ===
findstr /s /i "SectorPercentileEngine" *.ts engines\*.ts scoring\*.ts analytics\*.ts sectors\*.ts
echo.
echo === Files importing SectorDistributionEngine ===
findstr /s /i "SectorDistributionEngine" *.ts engines\*.ts scoring\*.ts analytics\*.ts sectors\*.ts
