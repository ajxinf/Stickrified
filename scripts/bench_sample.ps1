# Resource sampler for scripts/bench.mjs: one JSON line per ~1.5 s until the stop file appears. Counters are resolved on
# every sample (typeperf resolves wildcards once at start, before Chrome exists, and then reads zeros).
param([string]$Out, [string]$Stop)
$counters = "\Processor(_Total)\% Processor Time", "\Memory\Available MBytes",
  "\GPU Engine(*engtype_3D)\Utilization Percentage", "\GPU Engine(*engtype_VideoEncode)\Utilization Percentage"
while (-not (Test-Path $Stop)) {
  $s = (Get-Counter $counters -MaxSamples 1 -ErrorAction SilentlyContinue).CounterSamples
  $g3 = @{}; $ge = @{}
  foreach ($c in $s) {
    if ($c.InstanceName -match "luid_(0x[0-9a-f]+_0x[0-9a-f]+).*engtype_(3d|videoencode)") {
      $h = if ($Matches[2] -eq "3d") { $g3 } else { $ge }
      $h[$Matches[1]] = [double]$h[$Matches[1]] + $c.CookedValue
    }
  }
  $cpu = ($s | Where-Object { $_.Path -match "processor time" }).CookedValue
  $free = ($s | Where-Object { $_.Path -match "available mbytes" }).CookedValue
  $chrome = [int]((Get-Process chrome-headless-shell -ErrorAction SilentlyContinue | Measure-Object PrivateMemorySize64 -Sum).Sum / 1MB)
  $nv = (nvidia-smi --query-gpu=utilization.gpu,utilization.encoder,memory.used --format=csv,noheader,nounits) -split ",\s*"
  [pscustomobject]@{ cpu = [math]::Round($cpu, 1); free = [int]$free; chrome = $chrome; g3d = $g3; genc = $ge;
    nv = @([int]$nv[0], [int]$nv[1], [int]$nv[2]) } | ConvertTo-Json -Compress -Depth 3 | Add-Content -Path $Out -Encoding utf8
}
