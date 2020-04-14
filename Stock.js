"use strict";

var DatabaseService = require('./DatabaseService.js');

module.exports = class Stock {
  static getAllAsync() {
    var query = 'SELECT stock_name as name, number_shares, purchase_price FROM [dbo].[Portfolio]';
    return DatabaseService.executeQueryAsync(query).then(function(dataArray) {
      var result = [];
      dataArray.forEach(function(data) {
        result.push({
          name: data.name,
          numberShares: data.number_shares,
          purchasePrice: data.purchase_price
        })
      });
      return result;
    });
  }
  
  static getLatestAsync() {
    var query = `
SELECT name, trade_price, reference
  FROM [dbo].[Stock_History]
  WHERE timestamp = (SELECT TOP 1 timestamp from [dbo].[Stock_History] ORDER BY timestamp DESC)
`;
    return DatabaseService.executeQueryAsync(query).then(function(dataArray) {
      var result = [];
      dataArray.forEach(function(data) {
        result.push({
          name: data.name,
          currentPrice: (data.trade_price === 0 ? data.reference : data.trade_price)
        })
      });
      return result;
    });
  }
  
  static getTransactionsAsync() {
    var query = `
SELECT [transactionId], [created], [stock_name], [type], [properties]
  FROM [dbo].[Transaction_Stock]
order by [created]
`;
    return DatabaseService.executeQueryAsync(query).then(function(dataArray) {
      return dataArray.map(function(t) {
        return {
          transactionId: t.transactionId,
          created: new Date(t.created).getTime(),
          stock: t.stock_name,
          type: t.type,
          properties: JSON.parse(t.properties)
        };
      });
    });
  }
  
  static summarizeAsync(stockData) {
    var timestamp = (new Date()).toISOString().slice(0,10);
    var query = '';
    stocks.forEach(function(stock) {
      var stock = stockData.split(',');
      if (stock.length < 12) return;
      query += `
INSERT INTO [dbo].[Stock_History]([timestamp], [name], [reference], [ceiling], [floor], [trade_price], [trade_volume]) 
VALUES('${timestamp}','${stock[0]}', ${stock[1]}, ${stock[2]}, ${stock[3]}, ${stock[10]}, ${stock[11]})
`;
    });
    return DatabaseService.executeQueryAsync(query);
  }

  static summarizeAsyncV2(stocks) {
    var timestamp = (new Date()).toISOString().slice(0,10);
    var query = '';
    stocks.forEach(function(stock) {
      query += `
INSERT INTO [dbo].[Stock_History]([timestamp], [name], [reference], [ceiling], [floor], [trade_price], [trade_volume]) 
VALUES('${timestamp}','${stock.nane}', ${stock.reference}, ${stock.ceiling}, ${stock.floor}, ${stock.tradePrice}, ${stock.tradeVolume})
`;
    });
    return DatabaseService.executeQueryAsync(query);
  }
  
  static buyAsync(data) {
    // data: {name, numberShares, price}
    var error = new Error("Invalid input");
    error.status = 400;
    if (!this.validateInput(data)) {
      return Promise.reject(error);
    }
    
    data.name = data.name.toUpperCase();
    if (!this.validateStockExists(data.name)) {
      console.log(data.name);
      error.message = "Stock not found in HSC";
      return Promise.reject(error);
    }
    
    // stock name should be all uppercase
    const transactionFeeRate = 0.0035; // 0.35% transaction fee
    var fee = Math.round(data.numberShares * data.price * transactionFeeRate);
    var cashDecrease = Math.round(data.numberShares * data.price + fee); 
    return this.getAllAsync()
      .then(function (portfolio) {
        var cashStock = portfolio.find(s => s.name === 'CASH');
        if (cashStock.number_shares * cashStock.purchase_price < cashDecrease) {
          throw error;
        }
        return portfolio;
      })
      .then(function (portfolio) {
        var details = JSON.stringify(data);
        var found = portfolio.find(s => s.name === data.name);
        
        var stockQuery = '';
        if (found) {
          // existing stock
          var newPurchasePrice = (found.purchasePrice * found.numberShares + data.numberShares * data.price) / (found.numberShares + data.numberShares);
          stockQuery = `
UPDATE Portfolio
SET number_shares = number_shares + ${data.numberShares}, purchase_price = ${newPurchasePrice} 
WHERE stock_name = '${data.name}'
`;
        }
        else {
          stockQuery = `
INSERT INTO Portfolio (stock_name, number_shares, purchase_price)
VALUES ('${data.name}', ${data.numberShares}, ${data.price})
`;
        }
        
        var query = `
BEGIN TRAN T1

${stockQuery}

UPDATE Portfolio
SET number_shares = number_shares - ${cashDecrease} 
WHERE stock_name = 'CASH'

UPDATE Summary_History
SET fee = fee + ${fee} 
WHERE timestamp = (SELECT TOP 1 timestamp FROM Summary_History ORDER BY timestamp DESC)

INSERT INTO Transaction_Stock (transactionId, created, type, stock_name, properties, notes)
VALUES (NEWID(), GETDATE(), 'buy', '${data.name}', '${details}', 'From website')

COMMIT TRAN T1
`;
        return DatabaseService.executeQueryAsync(query);
      });
  }
  
  static sellAsync(data) {
    // data: {name, numberShares, price}
    var error = new Error("Invalid input");
    error.status = 400;
    if (!this.validateInput(data)) {
      return Promise.reject(error);
    }
    
    // stock name should be all uppercase
    data.name = data.name.toUpperCase();
    
    return this.getAllAsync()
      .then(function (portfolio) {
        var foundStock = portfolio.find(s => s.name === data.name);
        if (!foundStock) {
          error.message = "Stock not found"
          throw error;
        }
        if (foundStock.number_shares < data.numberShares) {
          error.message = "Exceeded current number of shares"
          throw error;
        }
      })
      .then(function () {
        const transactionFeeRate = 0.0045; // 0.35% transaction fee, 0.1% tax
        var fee = Math.round(data.numberShares * data.price * transactionFeeRate);
        var details = JSON.stringify(data);
        var cashIncrease = Math.round(data.numberShares * data.price - fee); 
        var query = `
BEGIN TRAN T1

UPDATE Portfolio
SET number_shares = number_shares - ${data.numberShares} 
WHERE stock_name = '${data.name}'

UPDATE Portfolio
SET number_shares = number_shares + ${cashIncrease} 
WHERE stock_name = 'CASH'

UPDATE Summary_History
SET fee = fee + ${fee} 
WHERE timestamp = (SELECT TOP 1 timestamp FROM Summary_History ORDER BY timestamp DESC)

INSERT INTO Transaction_Stock (transactionId, created, type, stock_name, properties, notes)
VALUES (NEWID(), GETDATE(), 'sell', '${data.name}', '${details}', 'From website')

COMMIT TRAN T1
    `;
        return DatabaseService.executeQueryAsync(query);
      });
  }
  
  static addDividend(data) {
    // data: {name, dividend}
    var error = new Error("Invalid input");
    error.status = 400;
    if (!data.name || !data.dividend) {
      return Promise.reject(error);
    }
    if (isNaN(data.dividend)) {
      return Promise.reject(error);
    }
    
    // stock name should be all uppercase
    data.name = data.name.toUpperCase();
    
    return this.getAllAsync()
      .then(function (portfolio) {
        var foundStock = portfolio.find(s => s.name === data.name);
        if (!foundStock) {
          throw error;
        }
      })
      .then(function () {
        var details = JSON.stringify(data);
        var query = `
BEGIN TRAN T1

UPDATE Portfolio
SET dividend = ISNULL(dividend, 0) + ${data.dividend} 
WHERE stock_name = '${data.name}'

UPDATE Portfolio
SET number_shares = number_shares + ${data.dividend} 
WHERE stock_name = 'CASH'

UPDATE Summary_History
SET dividend = dividend + ${data.dividend} 
WHERE timestamp = (SELECT TOP 1 timestamp FROM Summary_History ORDER BY timestamp DESC)

INSERT INTO Transaction_Stock (transactionId, created, type, stock_name, properties, notes)
VALUES (NEWID(), GETDATE(), 'dividend', '${data.name}', '${details}', 'From website')

COMMIT TRAN T1
    `;
        return DatabaseService.executeQueryAsync(query);
      });
  }
  
  static validateInput(stockData) {
    if (!stockData.name || !stockData.numberShares || !stockData.price) {
      return false;
    }
    
    if (isNaN(stockData.numberShares) || isNaN(stockData.price)) {
      return false;
    }
    return true;
  }
  
  static validateStockExists(stockName) {
    const hcmStocks = "AAM,ABT,ACC,ACL,AGF,AGM,AGR,AMD,ANV,APC,ASM,ASP,ATA,BBC,BCE,BCG,BCI,BFC,BGM,BHS,BIC,BID,BMC,BMI,BMP,BRC,BSI,BTP,BTT,BVH,C32,C47,CAV,CCI,CCL,CDC,CDO,CIG,CII,CLC,CLG,CLL,CLW,CMG,CMT,CMV,CMX,CNG,COM,CSM,CSV,CTD,CTG,CTI,CYC,D2D,DAG,DAT,DCL,DCM,DGW,DHA,DHC,DHG,DHM,DIC,DIG,DLG,DMC,DPM,DPR,DQC,DRC,DRH,DRL,DSN,DTA,DTL,DTT,DVP,DXG,DXV,E1VFVN30,EIB,ELC,EMC,EVE,FCM,FCN,FDC,FIT,FLC,FMC,FPT,GAS,GDT,GIL,GMC,GMD,GSP,GTA,GTN,GTT,HAG,HAH,HAI,HAP,HAR,HAS,HAX,HBC,HCM,HDC,HDG,HHS,HLG,HMC,HNG,HOT,HPG,HQC,HRC,HSG,HT1,HTI,HTL,HTV,HU1,HU3,HVG,HVX,ICF,IDI,IJC,IMP,ITA,ITC,ITD,JVC,KAC,KBC,KDC,KDH,KHA,KHP,KMR,KPF,KSA,KSB,KSH,KSS,L10,LAF,LBM,LCG,LCM,LDG,LGC,LGL,LHG,LIX,LM8,LSS,MBB,MCG,MCP,MDG,MHC,MSN,MWG,NAF,NAV,NBB,NCT,NKG,NLG,NNC,NSC,NT2,NTL,NVT,OGC,OPC,PAC,PAN,PDN,PDR,PET,PGC,PGD,PGI,PHR,PIT,PJT,PNC,PNJ,POM,PPC,PPI,PTB,PTC,PTL,PVD,PVT,PXI,PXL,PXS,PXT,QBS,QCG,RAL,RDP,REE,RIC,SAM,SAV,SBA,SBT,SC5,SCD,SFC,SFG,SFI,SGT,SHI,SHP,SII,SJD,SJS,SKG,SMA,SMC,SPM,SRC,SRF,SSC,SSI,ST8,STB,STG,STK,STT,SVC,SVI,SVT,SZL,TAC,TBC,TCL,TCM,TCO,TCR,TCT,TDC,TDH,TDW,THG,TIC,TIE,TIP,TIX,TLG,TLH,TMP,TMS,TMT,TNA,TNC,TNT,TPC,TRA,TRC,TS4,TSC,TTF,TV1,TVS,TYA,UDC,UIC,VAF,VCB,VCF,VFG,VHC,VHG,VIC,VID,VIP,VIS,VLF,VMD,VNA,VNE,VNG,VNH,VNL,VNM,VNS,VOS,VPH,VPK,VPS,VRC,VSC,VSH,VSI,VTB,VTO";
    const hnStocks = "AAA,ACB,ACM,ADC,ALT,ALV,AMC,AME,AMV,APG,API,APP,APS,ARM,ASA,ATS,B82,BAM,BBS,BCC,BDB,BED,BHT,BII,BKC,BLF,BPC,BSC,BST,BTS,BVS,BXH,C92,CAN,CAP,CCM,CEO,CHP,CID,CJC,CKV,CMC,CMI,CMS,CPC,CSC,CT6,CTA,CTB,CTC,CTN,CTS,CTT,CTX,CVN,CVT,CX8,D11,DAD,DAE,DBC,DBT,DC2,DC4,DCS,DGC,DGL,DHP,DHT,DID,DIH,DL1,DLR,DNC,DNM,DNP,DNY,DP3,DPC,DPS,DST,DXP,DZM,E1SSHN30,EBS,ECI,EFI,EID,FDT,FID,G20,GLT,GMX,HAD,HAT,HBE,HBS,HCC,HCT,HDA,HDO,HEV,HGM,HHC,HHG,HJS,HKB,HLC,HLD,HLY,HMH,HNM,HOM,HPM,HPS,HST,HTC,HTP,HUT,HVA,HVT,ICG,IDJ,IDV,INC,INN,ITQ,IVS,KDM,KHB,KHL,KKC,KLF,KLS,KMT,KSD,KSK,KSQ,KST,KTS,KTT,KVC,L14,L18,L35,L43,L44,L61,L62,LAS,LBE,LCD,LCS,LDP,LHC,LIG,LM7,LO5,LTC,LUT,MAC,MAS,MBG,MBS,MCC,MCF,MCO,MDC,MEC,MHL,MIM,MKV,MNC,MPT,NAG,NBC,NBP,NDF,NDN,NDX,NET,NFC,NGC,NHA,NHC,NHP,NPS,NST,NTP,NVB,OCH,ONE,ORS,PBP,PCE,PCG,PCN,PCT,PDB,PDC,PEN,PGS,PGT,PHC,PHP,PIV,PJC,PLC,PMB,PMC,PMP,PMS,POT,PPE,PPP,PPS,PPY,PRC,PSC,PSD,PSE,PSI,PSW,PTD,PTI,PTS,PV2,PVB,PVC,PVE,PVG,PVI,PVL,PVR,PVS,PVV,PVX,PXA,QHD,QNC,QST,QTC,RCL,S12,S55,S74,S99,SAF,SAP,SCI,SCJ,SCL,SCR,SD2,SD4,SD5,SD6,SD7,SD9,SDA,SDC,SDD,SDE,SDG,SDH,SDN,SDP,SDT,SDU,SDY,SEB,SED,SFN,SGC,SGD,SGH,SGO,SHA,SHB,SHN,SHS,SIC,SJ1,SJC,SJE,SLS,SMN,SMT,SPI,SPP,SQC,SRA,SRB,SSM,STC,STP,SVN,TA9,TAG,TBX,TC6,TCS,TDN,TEG,TET,TFC,TH1,THB,THS,THT,TIG,TJC,TKC,TKU,TMC,TMX,TNG,TPH,TPP,TSB,TST,TTB,TTC,TTZ,TV2,TV3,TV4,TVC,TVD,TXM,UNI,V12,V21,VAT,VBC,VBH,VC1,VC2,VC3,VC5,VC6,VC7,VC9,VCC,VCG,VCM,VCR,VCS,VDL,VDS,VE1,VE2,VE3,VE4,VE8,VE9,VFR,VGP,VGS,VHL,VIE,VIG,VIT,VIX,VKC,VLA,VMC,VMI,VMS,VNC,VND,VNF,VNR,VNT,VSA,VTC,VTH,VTL,VTS,VTV,VXB,WCS,WSS";
    var allStocks = (hcmStocks + ',' + hnStocks).split(',');
    return allStocks.find(s => s === stockName);
  }
}