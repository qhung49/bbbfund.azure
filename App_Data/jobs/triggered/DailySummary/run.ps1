function Start-FundSummary($fundName)
{
  $query = @"
SELECT P.stock_name as name, P.number_shares, P.purchase_price, IIF(S.reference is null, P.purchase_price, IIF(S.trade_price = 0, S.reference, S.trade_price)) As current_price
  FROM [dbo].[Portfolio] P
  LEFT JOIN (
	  SELECT name, reference, trade_price, timestamp
      FROM [dbo].[Stock_History]
	  WHERE timestamp = (SELECT TOP 1 timestamp FROM [dbo].[Stock_History] ORDER BY timestamp DESC)
  ) S
  ON P.stock_name = S.name
  ORDER BY name
"@
  $stockData = Invoke-DatabaseQuery $connectionString $query
  
  $query = @"
SELECT value, start_date 
from Transaction_Investor  
where end_date > getutcdate()
"@
  $investorData = Invoke-DatabaseQuery $connectionString $query
  
  $query = @"
SELECT TOP 1 index_norm, change_percentage
from Market_History
WHERE name = '$fundName'
ORDER BY [timestamp] DESC
"@
  $marketData = Invoke-DatabaseQuery $connectionString $query
  
  $query = @"
SELECT TOP 1 profit, capital, dividend, fee
from Summary_History  
ORDER BY [timestamp] DESC
"@
  $summaryData = Invoke-DatabaseQuery $connectionString $query
  
  $newCapital = 0
  $investorData |% {$newCapital += $_.value}
  
  $stockValue = 0
  $stockData |% {$stockValue += $_.number_shares * $_.current_price}
  
  $newProfit = $stockValue - $newCapital
  $newIndex = $marketData.index_norm * $stockValue / ($newCapital + $summaryData.profit)
  $changePercentage = ($newIndex - $marketData.index_norm) / $marketData.index_norm * 100
  
  Write-Output "Profit: $newProfit"
  Write-Output "Index: $newIndex"
  Write-Output "Change Percentage: $changePercentage"
  
  $timestamp = (Get-Date).ToUniversalTime().ToShortDateString()
  
  $query = @"
INSERT INTO [dbo].[Summary_History]([timestamp], [profit], [capital], [dividend], [fee]) 
VALUES('$timestamp',$newProfit, $newCapital, $($summaryData.dividend), $($summaryData.fee))
"@
  $rows = Invoke-DatabaseNonQuery $connectionString $query
  Write-Output "Summary_History table updated. $rows rows affected."
  
  $query = @"
INSERT INTO [dbo].[Market_History]([timestamp], [name], [index_norm], [index_raw], [change_percentage]) 
VALUES('$timestamp','BBB', $newIndex, $newIndex, $changePercentage)
"@
  $rows = Invoke-DatabaseNonQuery $connectionString $query
  Write-Output "Market_History table updated. $rows rows affected."
}

function Process-Market($data)
{
  $marketCsvData = $data.Split("|")
  $marketDetails = @( 
    @{
      "Name" = "VN"; 
      "StartingIndex" = 574.3
    }, 
    @{
      "Name" = "VN30";
      "StartingIndex" = 615.7
    }
  )
  
  $query = ""
  for ($marketIndex = 0; $marketIndex -lt $marketDetails.Count; $marketIndex += 1)
  {
    $marketData = $marketCsvData[$marketIndex].Split(",")
    $marketDetails[$marketIndex].Add("IndexRaw", $marketData[3])
    $marketDetails[$marketIndex].Add("PercentageChange", $marketData[5])
    $marketDetails[$marketIndex].Add("IndexNormalized", $marketData[3] / $marketDetails[$marketIndex].StartingIndex * 100)
    
    $timestamp = (Get-Date).ToUniversalTime().ToShortDateString()
    $query += @"
INSERT INTO [dbo].[Market_History]([timestamp], [name], [index_norm], [index_raw], [change_percentage]) 
VALUES('$timestamp','$($marketDetails[$marketIndex].Name)', $($marketDetails[$marketIndex].IndexNormalized), $($marketDetails[$marketIndex].IndexRaw),$($marketDetails[$marketIndex].PercentageChange))
"@
  }

  $rows = Invoke-DatabaseNonQuery $connectionString $query
}

function Process-Stock($data)
{
  $stockCsvData = $data.Split("|")
  $stockDetails = @()

  $query = ""
  # Last data set is empty
  for ($stockIndex = 0; $stockIndex -lt ($stockCsvData.Count-1); $stockIndex += 1)
  {
    $stockData = $stockCsvData[$stockIndex].Split(",") 
    $stockDetails += @{}
    $stockDetails[$stockIndex].Name = $stockData[0]
    $stockDetails[$stockIndex].Reference = $stockData[1]
    $stockDetails[$stockIndex].Ceiling = $stockData[2]
    $stockDetails[$stockIndex].Floor = $stockData[3]
    
    $stockDetails[$stockIndex].Bid = @()
    for ($bidIndex = 0; $bidIndex -lt 3; $bidIndex += 1)
    {
        $stockDetails[$stockIndex].Bid += @{ "Price" = $stockData[4+$bidIndex*2]; "Volume" = $stockData[5+$bidIndex*2] }
    }
    
    $stockDetails[$stockIndex].Trade = @{ "Price" = $stockData[10]; "Volume" = $stockData[11] }

    $stockDetails[$stockIndex].Offer = @()
    for ($offerIndex = 0; $offerIndex -lt 3; $offerIndex += 1)
    {
        $stockDetails[$stockIndex].Offer += @{ "Price" = $stockData[12+$bidIndex*2]; "Volume" = $stockData[13+$bidIndex*2] }
    }

    $stockDetails[$stockIndex].ForeignRoom = $stockData[18]
    $stockDetails[$stockIndex].ForeignBuy = $stockData[19]

    #Ignore 20-25

    $timestamp = (Get-Date).ToUniversalTime().ToShortDateString()
    
    $query += @"
INSERT INTO [dbo].[Stock_History]([timestamp], [name], [reference], [ceiling], [floor], [trade_price], [trade_volume]) 
VALUES('$timestamp','$($stockDetails[$stockIndex].Name)', $($stockDetails[$stockIndex].Reference),$($stockDetails[$stockIndex].Ceiling), $($stockDetails[$stockIndex].Floor), 
$($stockDetails[$stockIndex].Trade.Price), $($stockDetails[$stockIndex].Trade.Volume))
"@
  }
  
  if ($query -eq "")
  {
    return
  }
  
  $rows = Invoke-DatabaseNonQuery $connectionString $query
}

############### MAIN ###################

# This is needed for Azure WebJobs to use Invoke-WebRequest
$ProgressPreference="SilentlyContinue"

Import-Module "./HelperModule.psm1" -Force

# Constants
$marketConfiguration = @(
    @{
      Name = "HCM";
      Link = "http://priceonline.hsc.com.vn/Process.aspx?Type=MS";
      SymbolList = "AAM,ABT,ACC,ACL,AGF,AGM,AGR,AMD,ANV,APC,ASM,ASP,ATA,BBC,BCE,BCG,BCI,BFC,BGM,BHS,BIC,BID,BMC,BMI,BMP,BRC,BSI,BTP,BTT,BVH,C32,C47,CAV,CCI,CCL,CDC,CDO,CIG,CII,CLC,CLG,CLL,CLW,CMG,CMT,CMV,CMX,CNG,COM,CSM,CSV,CTD,CTG,CTI,CYC,D2D,DAG,DAT,DCL,DCM,DGW,DHA,DHC,DHG,DHM,DIC,DIG,DLG,DMC,DPM,DPR,DQC,DRC,DRH,DRL,DSN,DTA,DTL,DTT,DVP,DXG,DXV,E1VFVN30,EIB,ELC,EMC,EVE,FCM,FCN,FDC,FIT,FLC,FMC,FPT,GAS,GDT,GIL,GMC,GMD,GSP,GTA,GTN,GTT,HAG,HAH,HAI,HAP,HAR,HAS,HAX,HBC,HCM,HDC,HDG,HHS,HLG,HMC,HNG,HOT,HPG,HQC,HRC,HSG,HT1,HTI,HTL,HTV,HU1,HU3,HVG,HVX,ICF,IDI,IJC,IMP,ITA,ITC,ITD,JVC,KAC,KBC,KDC,KDH,KHA,KHP,KMR,KPF,KSA,KSB,KSH,KSS,L10,LAF,LBM,LCG,LCM,LDG,LGC,LGL,LHG,LIX,LM8,LSS,MBB,MCG,MCP,MDG,MHC,MSN,MWG,NAF,NAV,NBB,NCT,NKG,NLG,NNC,NSC,NT2,NTL,NVT,OGC,OPC,PAC,PAN,PDN,PDR,PET,PGC,PGD,PGI,PHR,PIT,PJT,PNC,PNJ,POM,PPC,PPI,PTB,PTC,PTL,PVD,PVT,PXI,PXL,PXS,PXT,QBS,QCG,RAL,RDP,REE,RIC,SAM,SAV,SBA,SBT,SC5,SCD,SFC,SFG,SFI,SGT,SHI,SHP,SII,SJD,SJS,SKG,SMA,SMC,SPM,SRC,SRF,SSC,SSI,ST8,STB,STG,STK,STT,SVC,SVI,SVT,SZL,TAC,TBC,TCL,TCM,TCO,TCR,TDC,TDH,TDW,THG,TIC,TIE,TIX,TLG,TLH,TMP,TMS,TMT,TNA,TNC,TNT,TPC,TRA,TRC,TS4,TSC,TTF,TV1,TVS,TYA,UDC,UIC,VAF,VCB,VCF,VFG,VHC,VHG,VIC,VID,VIP,VIS,VLF,VMD,VNA,VNE,VNG,VNH,VNL,VNM,VNS,VOS,VPH,VPK,VPS,VRC,VSC,VSH,VSI,VTB,VTO";
    },
    @{
      Name = "HN";
      Link = "http://priceonline.hsc.com.vn/hnpriceonline/Process.aspx?Type=MS"
      SymbolList = "AAA,ACB,ACM,ADC,ALT,ALV,AMC,AME,AMV,APG,API,APP,APS,ARM,ASA,B82,BAM,BBS,BCC,BDB,BED,BHT,BII,BKC,BLF,BPC,BSC,BST,BTS,BVS,BXH,C92,CAN,CAP,CCM,CEO,CHP,CID,CJC,CKV,CMC,CMI,CMS,CPC,CSC,CT6,CTA,CTB,CTC,CTN,CTS,CTT,CTX,CVN,CVT,CX8,D11,DAC,DAD,DAE,DBC,DBT,DC2,DC4,DCS,DGC,DGL,DHP,DHT,DID,DIH,DL1,DLR,DNC,DNM,DNP,DNY,DP3,DPC,DPS,DST,DXP,DZM,E1SSHN30,EBS,ECI,EFI,EID,FDT,FID,G20,GLT,GMX,HAD,HAT,HBE,HBS,HCC,HCT,HDA,HDO,HEV,HGM,HHC,HHG,HJS,HKB,HLC,HLD,HLY,HMH,HNM,HOM,HPM,HPS,HST,HTC,HTP,HUT,HVA,HVT,ICG,IDJ,IDV,INC,INN,ITQ,IVS,KHB,KHL,KKC,KLF,KLS,KMT,KSD,KSK,KSQ,KST,KTS,KTT,KVC,L14,L18,L35,L43,L44,L61,L62,LAS,LBE,LCD,LCS,LDP,LHC,LIG,LM7,LO5,LTC,LUT,MAC,MAS,MBG,MCC,MCF,MCO,MDC,MEC,MHL,MIM,MKV,MNC,MPT,NAG,NBC,NBP,NDF,NDN,NDX,NET,NFC,NGC,NHA,NHC,NHP,NPS,NST,NTP,NVB,OCH,ONE,ORS,PBP,PCE,PCG,PCN,PCT,PDB,PDC,PEN,PGS,PGT,PHC,PHP,PIV,PJC,PLC,PMB,PMC,PMP,PMS,POT,PPE,PPP,PPS,PPY,PRC,PSC,PSD,PSE,PSI,PSW,PTD,PTI,PTS,PV2,PVB,PVC,PVE,PVG,PVI,PVL,PVR,PVS,PVV,PVX,PXA,QHD,QNC,QST,QTC,RCL,S12,S55,S74,S99,SAF,SAP,SCI,SCJ,SCL,SCR,SD2,SD4,SD5,SD6,SD7,SD9,SDA,SDC,SDD,SDE,SDG,SDH,SDN,SDP,SDT,SDU,SDY,SEB,SED,SFN,SGC,SGD,SGH,SGO,SHA,SHB,SHN,SHS,SIC,SJ1,SJC,SJE,SLS,SMN,SMT,SPI,SPP,SQC,SRA,SRB,SSM,STC,STP,SVN,TA9,TAG,TBX,TC6,TCS,TCT,TDN,TEG,TET,TFC,TH1,THB,THS,THT,TIG,TJC,TKC,TKU,TMC,TMX,TNG,TPH,TPP,TSB,TST,TTB,TTC,TTZ,TV2,TV3,TV4,TVC,TVD,TXM,UNI,V12,V21,VAT,VBC,VBH,VC1,VC2,VC3,VC5,VC6,VC7,VC9,VCC,VCG,VCM,VCR,VCS,VDL,VDS,VE1,VE2,VE3,VE4,VE8,VE9,VFR,VGP,VGS,VHL,VIE,VIG,VIT,VIX,VKC,VLA,VMC,VMI,VMS,VNC,VND,VNF,VNR,VNT,VSA,VTC,VTH,VTL,VTS,VTV,VXB,WCS,WSS";

    }
)
$connectionString = $env:SQLAZURECONNSTR_db_writer

$cookieValue = Get-CookieValue $connectionString
$webSession = Get-WebSession $cookieValue

$currentUtcDate = (Get-Date).ToUniversalTime()

foreach ($market in $marketConfiguration)
{
  Write-Output "Getting data for market '$($market.Name)'"
  $webRequest = Get-StockData -Url $market.Link -WebSession $webSession

  $responseData = $webRequest.Content.ToString()
  
  if ($market.Name -eq "HCM")
  {
    # We only need to get data from HCM market
    $marketData = $responseData.Split("^")[0]
    Process-Market $marketData 
  }
  
  $stockData = $responseData.Split("^")[1]
  Process-Stock $stockData
}

Start-FundSummary "BBB"