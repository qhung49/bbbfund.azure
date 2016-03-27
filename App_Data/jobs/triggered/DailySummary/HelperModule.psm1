function Invoke-ScriptBlockWithRetry([ScriptBlock]$ScriptBlock, $RetryDelaySeconds = 3, $MaxRetry = 2)
{
  # Execute 1 time, and retry $MaxRetry times
  for ($i = 0; $i -le $MaxRetry; $i++)
  {
    try
    {
      $result = & $ScriptBlock
      return $result
    }
    catch
    {
      if ($i -eq $MaxRetry)
      {
        throw "[$Command] command failed. Exception: " + $_.Exception.Message
      }
      
      Start-Sleep -Seconds 3 # Sleep 3 seconds to avoid transient errors 
    }
  }
}

function Invoke-DatabaseQuery($connectionString, $query)
{
  return Invoke-ScriptBlockWithRetry -ScriptBlock {
    $SqlConnection = New-Object System.Data.SqlClient.SqlConnection
    $SqlConnection.ConnectionString = $connectionString
      
    $SqlCmd = New-Object System.Data.SqlClient.SqlCommand
    $SqlCmd.CommandText = $query
    $SqlCmd.Connection = $SqlConnection
    
    $SqlConnection.Open()
    $Adapter = New-Object System.Data.Sqlclient.SqlDataAdapter $SqlCmd
    $Dataset = New-Object System.Data.DataSet
    $Adapter.Fill($DataSet) | Out-Null

    $SqlConnection.Close()
    return $DataSet.Tables
  }
}

function Invoke-DatabaseNonQuery($connectionString, $query)
{
  return Invoke-ScriptBlockWithRetry -ScriptBlock {
    $SqlConnection = New-Object System.Data.SqlClient.SqlConnection
    $SqlConnection.ConnectionString = $connectionString
      
    $SqlCmd = New-Object System.Data.SqlClient.SqlCommand
    $SqlCmd.CommandText = $query
    $SqlCmd.Connection = $SqlConnection
    
    $SqlConnection.Open()
    $rows = $SqlCmd.ExecuteNonQuery()
    $SqlConnection.Close()
    
    return $rows
  }
}

function Get-CookieValue($connectionString)
{
  $query = "SELECT * FROM [dbo].[Portfolio] WHERE stock_name <> 'CASH'"
  $result = Invoke-DatabaseQuery $connectionString $query
  return $result.stock_name -Join "|"
}

function Get-WebSession($cookieValue)
{
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    
  $cookie = New-Object System.Net.Cookie 
  $cookie.Name = "_kieHNXSF"
  $cookie.Value = $cookieValue
  $cookie.Domain = "hsc.com.vn"
  $session.Cookies.Add($cookie);
  
  $cookie = New-Object System.Net.Cookie   
  $cookie.Name = "_kieHoSESF"
  $cookie.Value = $cookieValue
  $cookie.Domain = "hsc.com.vn"
  $session.Cookies.Add($cookie);
  
  return $session
}

function Get-StockData($Url, $WebSession)
{
  $request = Invoke-ScriptBlockWithRetry -ScriptBlock { Invoke-WebRequest -Uri $Url -UseBasicParsing -WebSession $WebSession }
  if ($request.StatusCode -ne 200)
  {
    throw "Unable to get data. HTTP status code = $($request.StatusCode)"
  }
  else
  {
    return $request
  }
}