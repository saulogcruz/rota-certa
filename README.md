# 🚛 Rota Certa - MVP

Sistema de planejamento de rotas para caminhões que evita restrições de altura, peso e vias proibidas.

## O que é

Um MVP funcional para validar a ideia de negócio de um sistema B2B para transportadoras.

**Fluxo:**
1. Planejador cria rota no painel web
2. Sistema analisa restrições (pontes baixas, ZMRC, peso máximo, etc.)
3. Planejador envia link para o motorista via WhatsApp
4. Motorista abre o link e vê a rota com todos os alertas
5. Motorista clica "Abrir no Google Maps" e navega pela rota correta

## Como rodar

### Requisitos
- Node.js 18+ instalado

### Instalação

```bash
# Entrar na pasta do projeto
cd rota-certa

# Instalar dependências
npm install

# Iniciar o servidor
npm start
```

### Acessar

- **Painel do Planejador:** http://localhost:3000
- **Página da Rota (exemplo):** http://localhost:3000/rota/abc123

## Estrutura do Projeto

```
rota-certa/
├── server.js              # Servidor Express (API + páginas)
├── package.json           # Dependências
├── data/
│   └── restrictions.json  # Base de restrições (pontes, zonas, etc.)
└── public/
    ├── index.html         # Painel do Planejador
    └── rota.html          # Página da Rota (motorista)
```

## Restrições Mapeadas (MVP)

O sistema já vem com algumas restrições reais da região SP-Santos:

| Restrição | Tipo | Limite |
|-----------|------|--------|
| Viaduto Bresser | Altura | 3,8m |
| Túnel Ayrton Senna | Altura | 4,2m |
| Ponte Rio Cubatão | Peso | 45t |
| ZMRC (Centro SP) | Horário | 5h-21h dias úteis |
| VER (Marginais) | Horário | 6h-10h / 16h-20h |
| Balsa Santos-Guarujá | Peso | 40t |
| Ponte Porchat | Peso | 30t |
| Av. Puglisi (Guarujá) | Proibido | Caminhões |

## Como adicionar novas restrições

Edite o arquivo `data/restrictions.json` e adicione no array `restrictions`:

```json
{
  "id": "minha-nova-restricao",
  "name": "Nome da Restrição",
  "type": "height",         // height, weight, time_zone, prohibited, grade, info
  "max_height_m": 4.0,      // para type: height
  "max_weight_ton": 30,     // para type: weight
  "lat": -23.5505,
  "lng": -46.6333,
  "description": "Descrição detalhada",
  "severity": "danger"      // danger, warning, info
}
```

## API

### GET /api/vehicles
Lista tipos de veículos disponíveis.

### GET /api/restrictions
Lista todas as restrições cadastradas.

### POST /api/routes
Cria uma nova rota.

**Body:**
```json
{
  "origin": "Guarulhos, SP",
  "destination": "Porto de Santos",
  "vehicleId": "truck-truck",
  "vehiclePlate": "ABC-1234",
  "driverName": "João",
  "notes": "Entregar até 14h"
}
```

**Response:**
```json
{
  "success": true,
  "routeId": "abc123xyz",
  "shareLink": "http://localhost:3000/rota/abc123xyz",
  "alertsCount": 3,
  "route": { ... }
}
```

### GET /api/routes/:id
Busca uma rota pelo ID.

### GET /api/routes
Lista todas as rotas criadas.

## Próximos Passos

1. **Validar com 3-5 transportadoras** - mostrar o MVP, coletar feedback
2. **Expandir base de restrições** - mapear mais pontos da região
3. **Adicionar integração real com Google Maps** - calcular rotas de verdade
4. **Implementar autenticação** - login por empresa
5. **Adicionar banco de dados** - persistir rotas (hoje é em memória)

## Tecnologias

- **Backend:** Node.js + Express
- **Frontend:** HTML/CSS/JS puro (sem framework)
- **Mapa:** Leaflet + OpenStreetMap
- **ID único:** nanoid

## Licença

MVP privado - uso interno para validação.
