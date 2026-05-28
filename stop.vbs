Option Explicit

' NightCity Archive - 停止本地 Wiki
' 找到所有 vitepress 相关的 node 进程并结束

Dim sh, wmi, procs, p, killed
Set sh  = CreateObject("WScript.Shell")
Set wmi = GetObject("winmgmts:\\.\root\cimv2")
Set procs = wmi.ExecQuery("SELECT ProcessId, CommandLine FROM Win32_Process WHERE Name = 'node.exe'")

killed = 0
For Each p In procs
    If Not IsNull(p.CommandLine) Then
        If InStr(p.CommandLine, "vitepress") > 0 Or _
           InStr(p.CommandLine, "npm run dev") > 0 Or _
           InStr(p.CommandLine, "run-script dev") > 0 Then
            sh.Run "taskkill /PID " & p.ProcessId & " /T /F", 0, True
            killed = killed + 1
        End If
    End If
Next

' 静默退出, 不弹窗 (避免双击后还要点确定)
