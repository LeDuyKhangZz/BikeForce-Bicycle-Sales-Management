<#
.SYNOPSIS
    Lấy báo cáo đơn hàng theo ngày từ Pancake POS API.

.DESCRIPTION
    Mỗi ngày được tính theo giờ Việt Nam (UTC+7), không phụ thuộc múi giờ máy chạy.
    Script xuất một CSV tổng hợp và một CSV phụ theo nguồn đơn. Đơn hoàn thường
    được sàn cập nhật trễ, vì vậy số hoàn của ngày cũ có thể thay đổi khi chạy lại.

    Timestamp Unix và chuỗi có Z/offset được đổi theo offset đi kèm. Chuỗi ngày giờ
    không có thông tin múi giờ được coi là giờ Việt Nam và script sẽ cảnh báo.
#>
[CmdletBinding(DefaultParameterSetName = 'MacDinh')]
param(
    [Parameter(ParameterSetName = 'Ngay')]
    [ValidateNotNullOrEmpty()]
    [string[]]$Ngay,

    [Parameter(Mandatory = $true, ParameterSetName = 'Khoang')]
    [ValidateNotNullOrEmpty()]
    [string]$TuNgay,

    [Parameter(Mandatory = $true, ParameterSetName = 'Khoang')]
    [ValidateNotNullOrEmpty()]
    [string]$DenNgay,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$OutCsv,

    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string]$OutSummary
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$SHOP_ID = '1022081353'
$SHOP_NAME = 'Kho xe đạp bán Online'
$API_BASE_URL = "https://pos.pages.fm/api/v1/shops/$SHOP_ID/orders"
$PAGE_SIZE = 100
$MAX_RETRIES = 3
$VIETNAM_OFFSET = [TimeSpan]::FromHours(7)
$REPORT_PARAMETER_SET = $PSCmdlet.ParameterSetName
$HAS_NGAY_ARGUMENT = $PSBoundParameters.ContainsKey('Ngay')
$script:HasWarnedAboutNaiveTimestamp = $false

function Get-VietnamNow {
    return [DateTimeOffset]::UtcNow.ToOffset($VIETNAM_OFFSET)
}

function ConvertTo-ReportDate {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Value,

        [Parameter(Mandatory = $true)]
        [string]$ParameterName
    )

    $parsed = [DateTime]::MinValue
    $ok = [DateTime]::TryParseExact(
        $Value,
        'yyyy-MM-dd',
        [Globalization.CultureInfo]::InvariantCulture,
        [Globalization.DateTimeStyles]::None,
        [ref]$parsed
    )

    if (-not $ok) {
        throw "Tham số -$ParameterName phải có định dạng yyyy-MM-dd. Giá trị nhận được: '$Value'."
    }

    return [DateTime]::SpecifyKind($parsed.Date, [DateTimeKind]::Unspecified)
}

function Get-RequestedDates {
    $dates = [Collections.Generic.List[DateTime]]::new()

    if ($REPORT_PARAMETER_SET -eq 'Khoang') {
        $from = ConvertTo-ReportDate -Value $TuNgay -ParameterName 'TuNgay'
        $to = ConvertTo-ReportDate -Value $DenNgay -ParameterName 'DenNgay'
        if ($from -gt $to) {
            throw '-TuNgay không được lớn hơn -DenNgay.'
        }

        for ($date = $from; $date -le $to; $date = $date.AddDays(1)) {
            $dates.Add($date)
        }
    }
    elseif ($HAS_NGAY_ARGUMENT) {
        foreach ($value in $Ngay) {
            $dates.Add((ConvertTo-ReportDate -Value $value -ParameterName 'Ngay'))
        }
    }
    else {
        $vietnamToday = (Get-VietnamNow).Date.ToString('yyyy-MM-dd')
        $dates.Add((ConvertTo-ReportDate -Value $vietnamToday -ParameterName 'Ngay'))
    }

    return @($dates | Sort-Object -Unique)
}

function Get-PropertyValue {
    param(
        [AllowNull()]
        [object]$InputObject,

        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    if ($null -eq $InputObject) {
        return $null
    }

    $property = $InputObject.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }

    return $property.Value
}

function ConvertTo-DecimalValue {
    param([AllowNull()][object]$Value)

    if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) {
        return [decimal]0
    }

    try {
        return [Convert]::ToDecimal($Value, [Globalization.CultureInfo]::InvariantCulture)
    }
    catch {
        throw "Không thể đọc total_price '$Value' thành số."
    }
}

function ConvertFrom-PancakeTimestamp {
    param(
        [AllowNull()]
        [object]$Value,

        [Parameter(Mandatory = $true)]
        [string]$FieldName
    )

    if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) {
        return $null
    }

    $text = ([string]$Value).Trim()
    $unixNumber = [long]0
    if ([long]::TryParse($text, [ref]$unixNumber)) {
        # API có thể trả Unix giây hoặc mili-giây; phân biệt bằng độ lớn.
        if ([Math]::Abs($unixNumber) -ge 100000000000) {
            return [DateTimeOffset]::FromUnixTimeMilliseconds($unixNumber)
        }
        return [DateTimeOffset]::FromUnixTimeSeconds($unixNumber)
    }

    $hasExplicitZone = $text -match '(Z|[+-]\d{2}:?\d{2})$'
    if ($hasExplicitZone) {
        $timestamp = [DateTimeOffset]::MinValue
        $parsed = [DateTimeOffset]::TryParse(
            $text,
            [Globalization.CultureInfo]::InvariantCulture,
            [Globalization.DateTimeStyles]::AllowWhiteSpaces,
            [ref]$timestamp
        )
        if (-not $parsed) {
            throw "Không thể đọc trường $FieldName='$text'."
        }
        return $timestamp
    }

    $localDateTime = [DateTime]::MinValue
    $parsedLocal = [DateTime]::TryParse(
        $text,
        [Globalization.CultureInfo]::InvariantCulture,
        [Globalization.DateTimeStyles]::AllowWhiteSpaces,
        [ref]$localDateTime
    )
    if (-not $parsedLocal) {
        throw "Không thể đọc trường $FieldName='$text'."
    }

    if (-not $script:HasWarnedAboutNaiveTimestamp) {
        Write-Warning 'Pancake trả timestamp không có Z/offset; script đang hiểu các giá trị này là giờ Việt Nam (UTC+7).'
        $script:HasWarnedAboutNaiveTimestamp = $true
    }

    $unspecified = [DateTime]::SpecifyKind($localDateTime, [DateTimeKind]::Unspecified)
    return [DateTimeOffset]::new($unspecified, $VIETNAM_OFFSET)
}

function Get-SafeHttpStatusCode {
    param([Parameter(Mandatory = $true)][object]$Exception)

    $response = Get-PropertyValue -InputObject $Exception -Name 'Response'
    $status = Get-PropertyValue -InputObject $response -Name 'StatusCode'
    if ($null -eq $status) {
        return $null
    }

    try {
        return [int]$status
    }
    catch {
        return $null
    }
}

function Invoke-PancakeRequest {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Uri,

        [Parameter(Mandatory = $true)]
        [int]$PageNumber
    )

    for ($attempt = 1; $attempt -le $MAX_RETRIES; $attempt++) {
        try {
            return Invoke-RestMethod -Method Get -Uri $Uri -TimeoutSec 60 -ErrorAction Stop
        }
        catch {
            $statusCode = Get-SafeHttpStatusCode -Exception $_.Exception
            if ($statusCode -eq 401 -or $statusCode -eq 403) {
                throw "Pancake từ chối xác thực (HTTP $statusCode). Hãy kiểm tra secret PANCAKE_API_KEY; key có thể sai hoặc đã hết hạn."
            }

            if ($attempt -eq $MAX_RETRIES) {
                $statusText = if ($null -eq $statusCode) { 'không có mã HTTP' } else { "HTTP $statusCode" }
                throw "Không lấy được trang $PageNumber sau $MAX_RETRIES lần thử ($statusText)."
            }

            $delaySeconds = [Math]::Pow(2, $attempt)
            $statusText = if ($null -eq $statusCode) { 'lỗi mạng' } else { "HTTP $statusCode" }
            Write-Warning "Trang $PageNumber gặp $statusText; thử lại lần $($attempt + 1)/$MAX_RETRIES sau $delaySeconds giây."
            Start-Sleep -Seconds $delaySeconds
        }
    }
}

function Get-PancakeOrdersForDate {
    param(
        [Parameter(Mandatory = $true)]
        [DateTime]$Date,

        [Parameter(Mandatory = $true)]
        [string]$ApiKey
    )

    $dayStart = [DateTimeOffset]::new($Date, $VIETNAM_OFFSET)
    $dayEndInclusive = $dayStart.AddDays(1).AddSeconds(-1)
    $encodedKey = [Uri]::EscapeDataString($ApiKey)
    $orders = [Collections.Generic.List[object]]::new()
    $pageNumber = 1

    while ($true) {
        # Không ghi URI ra log vì URI chứa api_key.
        $uri = '{0}?api_key={1}&startDateTime={2}&endDateTime={3}&page_size={4}&page_number={5}' -f @(
            $API_BASE_URL,
            $encodedKey,
            $dayStart.ToUnixTimeSeconds(),
            $dayEndInclusive.ToUnixTimeSeconds(),
            $PAGE_SIZE,
            $pageNumber
        )
        $response = Invoke-PancakeRequest -Uri $uri -PageNumber $pageNumber
        $pageData = Get-PropertyValue -InputObject $response -Name 'data'
        if ($null -eq $pageData -or @($pageData).Count -eq 0) {
            break
        }

        foreach ($order in @($pageData)) {
            $insertedAt = ConvertFrom-PancakeTimestamp -Value (Get-PropertyValue $order 'inserted_at') -FieldName 'inserted_at'
            if ($null -eq $insertedAt) {
                Write-Warning "Bỏ qua một đơn không có inserted_at ở trang $pageNumber."
                continue
            }

            $localDate = $insertedAt.ToOffset($VIETNAM_OFFSET).Date
            if ($localDate -eq $Date.Date) {
                $orders.Add($order)
            }
        }

        $pageNumber++
    }

    return @($orders)
}

function Test-HasAdsSignal {
    param([Parameter(Mandatory = $true)][object]$Order)

    foreach ($field in @('ads_source', 'ad_id', 'p_utm_campaign')) {
        $value = Get-PropertyValue -InputObject $Order -Name $field
        if ($null -ne $value -and -not [string]::IsNullOrWhiteSpace([string]$value)) {
            return $true
        }
    }
    return $false
}

function Get-PancakeDailyReport {
    param(
        [Parameter(Mandatory = $true)]
        [DateTime]$Date,

        [Parameter(Mandatory = $true)]
        [object[]]$Orders,

        [Parameter(Mandatory = $true)]
        [DateTimeOffset]$NowVietnam
    )

    [int]$cancelled = 0
    [int]$returned = 0
    [int]$late = 0
    [int]$adsOrders = 0
    [decimal]$revenue = 0
    [decimal]$adsGmv = 0
    $sourceBuckets = @{}

    foreach ($order in $Orders) {
        $status = [int](Get-PropertyValue -InputObject $order -Name 'status')
        $price = ConvertTo-DecimalValue (Get-PropertyValue -InputObject $order -Name 'total_price')

        if ($status -eq 6) {
            $cancelled++
            continue
        }

        $revenue += $price
        if ($status -eq 4 -or $status -eq 5) {
            $returned++
        }

        if ($status -eq 1 -or $status -eq 2) {
            $additionalInfo = Get-PropertyValue -InputObject $order -Name 'additional_info'
            $deadlineValue = Get-PropertyValue -InputObject $additionalInfo -Name 'delivery_deadline'
            $deadline = ConvertFrom-PancakeTimestamp -Value $deadlineValue -FieldName 'additional_info.delivery_deadline'
            if ($null -ne $deadline -and $deadline.ToUniversalTime() -lt $NowVietnam.ToUniversalTime()) {
                $late++
            }
        }

        if (Test-HasAdsSignal -Order $order) {
            $adsOrders++
            $adsGmv += $price
        }

        $source = [string](Get-PropertyValue -InputObject $order -Name 'order_sources_name')
        if ([string]::IsNullOrWhiteSpace($source)) {
            $source = 'Không xác định'
        }
        if (-not $sourceBuckets.ContainsKey($source)) {
            $sourceBuckets[$source] = [pscustomobject]@{ SoDon = 0; DoanhThu = [decimal]0 }
        }
        $sourceBuckets[$source].SoDon++
        $sourceBuckets[$source].DoanhThu += $price
    }

    $dateText = $Date.ToString('yyyy-MM-dd')
    $daily = [pscustomobject][ordered]@{
        Ngay = $dateText
        ShopId = $SHOP_ID
        TenShop = $SHOP_NAME
        SoDon = $Orders.Count
        DoanhThu = $revenue
        DonHuy = $cancelled
        DonHoan = $returned
        DonTre = $late
        DonTuAds = $adsOrders
        GMV_Ads = $adsGmv
    }

    $bySource = @(
        foreach ($source in @($sourceBuckets.Keys | Sort-Object)) {
            [pscustomobject][ordered]@{
                Ngay = $dateText
                NguonDon = $source
                SoDon = $sourceBuckets[$source].SoDon
                DoanhThu = $sourceBuckets[$source].DoanhThu
            }
        }
    )

    return [pscustomobject]@{ Daily = $daily; BySource = $bySource }
}

function Write-Utf8BomCsv {
    param(
        [Parameter(Mandatory = $true)]
        [object[]]$Data,

        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string[]]$Headers
    )

    $fullPath = [IO.Path]::GetFullPath($Path)
    $directory = [IO.Path]::GetDirectoryName($fullPath)
    if (-not [string]::IsNullOrWhiteSpace($directory)) {
        [IO.Directory]::CreateDirectory($directory) | Out-Null
    }

    $rows = if ($Data.Count -gt 0) {
        @($Data | ConvertTo-Csv -NoTypeInformation)
    }
    else {
        @([pscustomobject][ordered]@{} | Select-Object -Property $Headers | ConvertTo-Csv -NoTypeInformation | Select-Object -First 1)
    }
    $content = ($rows -join [Environment]::NewLine) + [Environment]::NewLine
    [IO.File]::WriteAllText($fullPath, $content, [Text.UTF8Encoding]::new($true))
    return $fullPath
}

function Get-BySourceCsvPath {
    param([Parameter(Mandatory = $true)][string]$Path)

    $fullPath = [IO.Path]::GetFullPath($Path)
    $directory = [IO.Path]::GetDirectoryName($fullPath)
    $name = [IO.Path]::GetFileNameWithoutExtension($fullPath)
    return [IO.Path]::Combine($directory, "$name-by-source.csv")
}

function Format-VietnamMoney {
    param([Parameter(Mandatory = $true)][decimal]$Value)
    return $Value.ToString('#,0', [Globalization.CultureInfo]::GetCultureInfo('vi-VN')) + 'đ'
}

function Write-Reports {
    param(
        [Parameter(Mandatory = $true)][object[]]$DailyReports,
        [Parameter(Mandatory = $true)][object[]]$SourceReports
    )

    Write-Host ''
    Write-Host 'BÁO CÁO ĐƠN HÀNG PANCAKE'
    $DailyReports | Format-Table Ngay, SoDon, DoanhThu, DonHuy, DonHoan, DonTre, DonTuAds, GMV_Ads -AutoSize | Out-Host

    Write-Host 'CHI TIẾT THEO NGUỒN (không gồm đơn hủy)'
    if ($SourceReports.Count -eq 0) {
        Write-Host 'Không có đơn không hủy trong kỳ.'
    }
    else {
        $SourceReports | Format-Table Ngay, NguonDon, SoDon, DoanhThu -AutoSize | Out-Host
    }

    $summaryLines = @(
        foreach ($report in $DailyReports) {
            'Báo cáo {0}: {1} đơn, doanh thu {2}, hủy {3}, hoàn {4}, trễ {5}' -f @(
                $report.Ngay,
                $report.SoDon,
                (Format-VietnamMoney $report.DoanhThu),
                $report.DonHuy,
                $report.DonHoan,
                $report.DonTre
            )
        }
    )

    foreach ($line in $summaryLines) {
        Write-Host "SUMMARY: $line"
    }

    if (-not [string]::IsNullOrWhiteSpace($OutSummary)) {
        $summaryPath = [IO.Path]::GetFullPath($OutSummary)
        $summaryDirectory = [IO.Path]::GetDirectoryName($summaryPath)
        if (-not [string]::IsNullOrWhiteSpace($summaryDirectory)) {
            [IO.Directory]::CreateDirectory($summaryDirectory) | Out-Null
        }
        [IO.File]::WriteAllText($summaryPath, ($summaryLines -join "`n"), [Text.UTF8Encoding]::new($false))
    }
}

try {
    if ([string]::IsNullOrWhiteSpace($env:PANCAKE_API_KEY)) {
        throw 'Thiếu biến môi trường PANCAKE_API_KEY. Script không đọc API key từ file hoặc tham số.'
    }

    $requestedDates = @(Get-RequestedDates)
    $nowVietnam = Get-VietnamNow
    $dailyReports = [Collections.Generic.List[object]]::new()
    $sourceReports = [Collections.Generic.List[object]]::new()

    foreach ($date in $requestedDates) {
        Write-Host "Đang lấy dữ liệu ngày $($date.ToString('yyyy-MM-dd')) theo UTC+7..."
        $orders = @(Get-PancakeOrdersForDate -Date $date -ApiKey $env:PANCAKE_API_KEY)
        $result = Get-PancakeDailyReport -Date $date -Orders $orders -NowVietnam $nowVietnam
        $dailyReports.Add($result.Daily)
        foreach ($sourceRow in @($result.BySource)) {
            $sourceReports.Add($sourceRow)
        }
    }

    Write-Reports -DailyReports @($dailyReports) -SourceReports @($sourceReports)
    $dailyPath = Write-Utf8BomCsv -Data @($dailyReports) -Path $OutCsv -Headers @('Ngay', 'ShopId', 'TenShop', 'SoDon', 'DoanhThu', 'DonHuy', 'DonHoan', 'DonTre', 'DonTuAds', 'GMV_Ads')
    $sourcePath = Write-Utf8BomCsv -Data @($sourceReports) -Path (Get-BySourceCsvPath $OutCsv) -Headers @('Ngay', 'NguonDon', 'SoDon', 'DoanhThu')
    Write-Host "Đã ghi CSV tổng hợp: $dailyPath"
    Write-Host "Đã ghi CSV theo nguồn: $sourcePath"
    exit 0
}
catch {
    # Chỉ in thông báo đã kiểm soát; không in URI/request vì có thể chứa API key.
    [Console]::Error.WriteLine("LỖI: $($_.Exception.Message)")
    exit 1
}
