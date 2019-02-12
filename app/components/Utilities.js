export function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function isBusinessHour(date) {
  if (date.getUTCDay() === 0 || date.getUTCDay() === 6) { // Saturday and Sunday
    return false;
  }
  
  if (date.getUTCHours() < 2 || date.getUTCHours() >= 8) { // Outside Vietnam business hours
    return false;
  }
  
  return true;
}

export const refreshIntervalMs = 5000;