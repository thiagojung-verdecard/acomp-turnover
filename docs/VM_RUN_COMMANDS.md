# VM Run Commands

## 1) Entrar no projeto

```bash
cd /home/admin/acomp_turnover/acomp-turnover
mkdir -p logs
```

## 2) Atualizar código

```bash
git pull origin main
```

## 3) Parar apenas o processo desta app (porta 3001)

```bash
PID=$(lsof -ti:3001 -sTCP:LISTEN)
[ -n "$PID" ] && kill "$PID" || true
```

## 4) Build limpo

```bash
rm -rf .next
npm run build
```

## 5) Subir aplicação em background

```bash
nohup npm run start -- --hostname 0.0.0.0 --port 3001 > logs/frontend.log 2>&1 &
echo $! > logs/frontend.pid
```

## 6) Validar que subiu

```bash
ss -tulpn | grep ':3001'
tail -40 logs/frontend.log
curl -I http://localhost:3001
```

## 7) Parar usando PID salvo

```bash
kill "$(cat logs/frontend.pid)" 2>/dev/null || true
rm -f logs/frontend.pid
```
