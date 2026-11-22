# Before a render (user 2026-11-23: "close everything unnecessary that is consuming ram"): closes background apps that
# never hold unsaved work. Browsers, download managers and editors are left alone (they can hold tabs, downloads, files);
# the script lists them so they can be closed by hand. Called by scripts/render.mjs.
$safe = "PhoneExperienceHost", "NVIDIA Overlay", "CrossDeviceResume", "Widgets", "WidgetService", "GameBar",
  "GameBarFTServer", "YourPhone", "Cortana"
$before = (Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1KB
$closed = foreach ($n in $safe) { $p = Get-Process -Name $n -ErrorAction SilentlyContinue; if ($p) { $p | Stop-Process -Force -ErrorAction SilentlyContinue; $n } }
Start-Sleep -Milliseconds 800
$after = (Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1KB
$open = Get-Process -Name brave, chrome, msedge, firefox, fdm, Code, Discord, Spotify, Teams, ms-teams, steam, OneDrive -ErrorAction SilentlyContinue | Group-Object ProcessName |
  ForEach-Object { "{0} ({1} MB)" -f $_.Name, [int](($_.Group | Measure-Object WorkingSet64 -Sum).Sum / 1MB) }
"free RAM {0:N0} -> {1:N0} MB; closed: {2}" -f $before, $after, ($(if ($closed) { $closed -join ", " } else { "nothing" }))
if ($open) { "still open (close by hand if not needed): " + ($open -join ", ") }
