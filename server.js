const express = require('express');
const path = require('path');
const { nanoid } = require('nanoid');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Carregar dados
const restrictionsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'restrictions.json'), 'utf8')
);

// "Banco de dados" em memória para rotas criadas
const routesDB = new Map();

// ============================================
// API ENDPOINTS
// ============================================

// GET /api/vehicles - Lista veículos disponíveis
app.get('/api/vehicles', (req, res) => {
  res.json(restrictionsData.vehicles);
});

// GET /api/restrictions - Lista todas as restrições
app.get('/api/restrictions', (req, res) => {
  res.json(restrictionsData.restrictions);
});

// POST /api/routes - Criar nova rota
app.post('/api/routes', (req, res) => {
  const { 
    origin, 
    destination, 
    vehicleId, 
    vehiclePlate,
    driverName,
    notes 
  } = req.body;

  // Validação básica
  if (!origin || !destination || !vehicleId) {
    return res.status(400).json({ 
      error: 'Origem, destino e veículo são obrigatórios' 
    });
  }

  // Buscar dados do veículo
  const vehicle = restrictionsData.vehicles.find(v => v.id === vehicleId);
  if (!vehicle) {
    return res.status(400).json({ error: 'Veículo não encontrado' });
  }

  // Analisar restrições aplicáveis
  const alerts = analyzeRestrictions(vehicle, origin, destination);

  // Gerar ID único para a rota
  const routeId = nanoid(10);

  // Salvar rota
  const route = {
    id: routeId,
    origin,
    destination,
    vehicle,
    vehiclePlate: vehiclePlate || '',
    driverName: driverName || '',
    notes: notes || '',
    alerts,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };

  routesDB.set(routeId, route);

  // Gerar link para o motorista
  const shareLink = `${req.protocol}://${req.get('host')}/rota/${routeId}`;

  res.json({
    success: true,
    routeId,
    shareLink,
    alertsCount: alerts.length,
    route
  });
});

// GET /api/routes/:id - Buscar rota específica
app.get('/api/routes/:id', (req, res) => {
  const route = routesDB.get(req.params.id);
  
  if (!route) {
    return res.status(404).json({ error: 'Rota não encontrada' });
  }

  res.json(route);
});

// GET /api/routes - Listar todas as rotas (para o painel)
app.get('/api/routes', (req, res) => {
  const routes = Array.from(routesDB.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(routes);
});

// ============================================
// PÁGINAS HTML
// ============================================

// Página do planejador
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Página da rota (para o motorista)
app.get('/rota/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'rota.html'));
});

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function analyzeRestrictions(vehicle, origin, destination) {
  const alerts = [];
  const now = new Date();
  const currentHour = now.getHours();
  const dayOfWeek = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][now.getDay()];

  for (const restriction of restrictionsData.restrictions) {
    let isRelevant = false;
    let message = '';

    switch (restriction.type) {
      case 'height':
        if (vehicle.height_m >= restriction.max_height_m) {
          isRelevant = true;
          message = `Seu veículo (${vehicle.height_m}m) excede o limite de ${restriction.max_height_m}m`;
        } else if (vehicle.height_m >= restriction.max_height_m - 0.3) {
          isRelevant = true;
          message = `Atenção: limite de ${restriction.max_height_m}m (seu veículo: ${vehicle.height_m}m)`;
        }
        break;

      case 'weight':
        if (vehicle.weight_ton > restriction.max_weight_ton) {
          isRelevant = true;
          message = `Seu veículo (${vehicle.weight_ton}t) excede o limite de ${restriction.max_weight_ton}t`;
        }
        break;

      case 'time_zone':
        // Verificar se está em horário restrito
        const hours = restriction.restricted_hours.split(',');
        for (const range of hours) {
          const [start, end] = range.split('-').map(t => parseInt(t.split(':')[0]));
          if (currentHour >= start && currentHour < end) {
            if (restriction.restricted_days.includes(dayOfWeek)) {
              isRelevant = true;
              message = `Restrição ativa agora (${restriction.restricted_hours})`;
            }
          }
        }
        // Sempre alertar sobre zonas de restrição
        if (!isRelevant) {
          isRelevant = true;
          message = `Verificar horário: ${restriction.restricted_hours} (${restriction.restricted_days.join(', ')})`;
        }
        break;

      case 'prohibited':
        isRelevant = true;
        message = 'Via proibida para caminhões';
        break;

      case 'grade':
        if (vehicle.weight_ton > 30) {
          isRelevant = true;
          message = `Ladeira íngreme (${restriction.max_grade_percent}%). Cuidado com carga pesada.`;
        }
        break;

      case 'info':
        isRelevant = true;
        message = restriction.description;
        break;
    }

    if (isRelevant) {
      alerts.push({
        id: restriction.id,
        name: restriction.name,
        type: restriction.type,
        severity: restriction.severity,
        message,
        description: restriction.description,
        lat: restriction.lat,
        lng: restriction.lng
      });
    }
  }

  // Ordenar por severidade
  const severityOrder = { danger: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts;
}

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚛  ROTA CERTA - MVP                                    ║
║   Sistema de Rotas para Caminhões                         ║
║                                                           ║
║   Servidor rodando em: http://localhost:${PORT}              ║
║                                                           ║
║   Endpoints:                                              ║
║   • GET  /              → Painel do Planejador            ║
║   • GET  /rota/:id      → Página da Rota (motorista)      ║
║   • GET  /api/vehicles  → Lista de veículos               ║
║   • POST /api/routes    → Criar nova rota                 ║
║   • GET  /api/routes/:id → Buscar rota                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
