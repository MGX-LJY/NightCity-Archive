Option Explicit

' NightCity Archive - 启动本地 Wiki (VitePress dev server)
' 双击运行: 后台静默启动 npm run dev, 等 server 就绪后自动打开浏览器

Dim sh, fso, scriptDir, webDir, logFile, url
Set sh  = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
webDir    = scriptDir & "\web"
logFile   = webDir & "\dev.log"
url       = "http://localhost:5173/"

If Not fso.FolderExists(webDir) Then
    MsgBox "web/ folder not found at: " & webDir, vbCritical, "NightCity Archive"
    WScript.Quit 1
End If

' 若已在运行, 直接打开浏览器
Dim wmi, procs, p, alreadyRunning
Set wmi = GetObject("winmgmts:\\.\root\cimv2")
Set procs = wmi.ExecQuery("SELECT CommandLine FROM Win32_Process WHERE Name = 'node.exe'")
alreadyRunning = False
For Each p In procs
    If Not IsNull(p.CommandLine) Then
        If InStr(p.CommandLine, "vitepress") > 0 Then alreadyRunning = True
    End If
Next
If alreadyRunning Then
    sh.Run url, 1, False
    MsgBox "Dev server is already running." & vbCrLf & "Browser opened: " & url, _
           vbInformation, "NightCity Archive"
    WScript.Quit 0
End If

' 清空旧 log, 再静默后台启动 (0 = 隐藏窗口, False = 不等待)
On Error Resume Next
fso.DeleteFile logFile
On Error GoTo 0
sh.Run "cmd /c cd /d """ & webDir & """ && npm run dev > """ & logFile & """ 2>&1", 0, False

' 轮询 log 直到看到 Local URL (最多 60s)
Dim tries, ready, ts, content
tries = 0
ready = False
Do While tries < 60 And Not ready
    WScript.Sleep 1000
    If fso.FileExists(logFile) Then
        On Error Resume Next
        Set ts = fso.OpenTextFile(logFile, 1)
        If Err.Number = 0 Then
            content = ts.ReadAll
            ts.Close
            If InStr(content, "localhost:5173") > 0 Then ready = True
        End If
        Err.Clear
        On Error GoTo 0
    End If
    tries = tries + 1
Loop

If ready Then
    sh.Run url, 1, False
    MsgBox "Dev server started." & vbCrLf & "URL: " & url & vbCrLf & "Use stop.vbs to shut down.", _
           vbInformation, "NightCity Archive"
Else
    MsgBox "Dev server did not start in 60s." & vbCrLf & "Check log: " & logFile, _
           vbExclamation, "NightCity Archive"
End If
