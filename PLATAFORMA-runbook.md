# PLATAFORMA — el negocio de profes, con números verificados

> Estado (19-ago-2026): la vista `#/plataforma` está en la rama
> `claude/plataforma-profes` (demo navegable, etiquetada). El prototipo visual
> extendido (copiloto por alumno + recompensas, estilo Pangea) vive como
> artifact aparte. Este runbook es la fuente de verdad del plan de negocio:
> dos tandas de investigación (16 agentes, 19-ago-2026), cifras con fuente.
> Lo no verificado lleva ~.

## La tesis (en tres frases)

Al profesor independiente de idiomas le vendemos tres cosas: **gana más**
(comisión $1.50-2/h contra 15-33% del mercado), **cobra como quiera**
(USDC al instante → MoneyGram/banco/tarjeta según su país) y **enseña con
memoria** (el copiloto graba, transcribe, resume y recuerda cada alumno).
Los pagos son la razón de llegar, el copiloto la razón de quedarse, las
recompensas la razón de concentrar todas sus horas aquí.

## 1 · Comisiones del mercado (verificadas en fuente oficial, 19-08-2026)

| Plataforma | Take rate | Trampas extra | Payout |
|---|---|---|---|
| Preply | 33% → 28% (20 h) → 18% (400+ h) | Trial 100% para la plataforma; lecciones expiradas sin rollover; processing fee al alumno no publicado | Wallet interno → Wise ($10 mín) / PayPal (2%) / Payoneer; hasta 25 días efectivos |
| italki | 15% histórico · ~21% en 2026 (reporte de profes, sin fuente oficial) | Ciclos día 15/fin de mes + 10 días | Payoneer/PayPal/Skrill, mín $30 |
| Cambly | Tarifa fija $10.20/h adultos, $12 Kids | No pones precio; PayPal muere nov-2026 → Stripe | Semanal, mín $20 |
| AmazingTalker | 30% → 15% por ingresos + ~8% procesamiento | Tutor nuevo entrega ~38% | Dinero ~día 15 |
| Classgap | 32% → 16% por horas | 50-100% de la primera clase | Mensual, mín €25, solo EUR |
| Wyzant (USA) | 25% + 9% al alumno | — | Quincenal |
| Superprof | 0% (lead-gen) | El alumno paga pass $49/mes | Directo profe-alumno |
| **Nosotros** | **$1.50-2/h (7.5-10% a $20/h)** | Fee de tarjeta lo paga el alumno, visible | **USDC al instante** |

Ejemplo oficial de Preply: clase de $10 → tutor nuevo recibe $6.70
(help.preply.com art. 4171383). Nuestra vista `#/profes` ya lo cita.

**Ojo con el fee plano:** $1.50/h sobre una clase de $10 es 15% — igual que
italki. El fee plano es regresivo para el profe barato. Alternativas a
decidir: % con tope (ej. 8% máx $1.50), o plano solo desde $15/h.
DECISIÓN PENDIENTE de Gus.

## 2 · Dónde ganamos de verdad

- **Vs Preply**: +19% a +38% de neto para el profe. Es el enemigo del pitch.
- **Vs italki (15%)**: solo +$40-60/mes a 40 h — delgado. Si el ~21% se
  confirma, sube a +$88-108/mes. CONFIRMAR con capturas de profes activos.
- **Imbatible** donde los rails viejos fallan: monedas excluidas de Wise
  (BRL, INR…), países sin PayPal decente, y LATAM en general.
- **El nicho que señalan los datos**: profes LATAM de **español** vendiendo a
  EE.UU. (el español es la lengua #1 demandada en Norteamérica, 25% de la
  demanda de Preply, por encima del inglés) + profes de inglés para
  hispanohablantes (la base actual de Hablarte). Oferta y dolor en la misma
  región que nosotros.

## 3 · Rieles de retiro (estado real de proveedores)

- **MoneyGram Ramps**: nativo en Solana desde ago-2026, USDC, cash-out 170+
  países, API con sandbox. Fees por corredor NO publicados → **cotizar
  directo** (developer.moneygram.com).
- **Decaf**: MoneyGram 184 países (límite 2.500 USDC/día), bancos
  COP/MXN/BRL/ARS/SEPA/USD, PIX, tarjeta virtual $5. Sin API pública
  documentada ni pricing → **cotizar directo**.
- **Rain**: tarjetas white-label (Visa Principal Member, settlement USDC),
  8-12 semanas de lanzamiento, solo cotiza por demo.
- **Fin.com**: cuentas virtuales USA — ya integrado en sandbox en
  pangea-wallet (ADR-0014). Es el rail "cuenta bancaria en EE.UU. a tu nombre".
- **Costo real de aceptar tarjeta: 4-7%, no 3%**. Stripe exige LLC en USA
  (Colombia no soportado); on-ramps tarjeta→USDC cobran 4-8% efectivo. El fee
  al alumno debe presupuestarse a 4-5%, no 3%.
- **Regulatorio**: patrón non-custodial (FinCEN 2019 / MiCA): la plataforma
  JAMÁS controla fondos; el alumno paga al proveedor licenciado y el USDC
  llega directo al wallet del profe. Requisito de diseño desde el día 1 —
  un solo endpoint que custodie convierte esto en money transmitter.

## 4 · Copiloto del profe (la feature suscribible)

Loop: grabar (con consentimiento) → transcribir → resumir → ideas para la
próxima clase → memoria por alumno + chat de ideas. **No corrige al profe.**

- **Competencia**: el resumen suelto ya es commodity (Lessonspace lo regala a
  $9/mes; Preply Lesson Insights lo da en su jardín, English-only). El loop
  completo solo lo tiene **Bobbin** (TutorCruncher) a £79-289/mes — precio de
  agencia — y **abre standalone el 7-sep-2026**. El profe independiente
  hispanohablante no tiene dueño. La ventana es de meses.
- **Lo defendible**: la memoria longitudinal (a los 3 meses, cambiarse =
  perder el historial de 15 alumnos) + la integración con el cobro (nadie
  más tiene clase+pago+copiloto) + el idioma.
- **Framing que vende** (de Reddit, literal): "recuerda dónde quedamos en 2
  minutos, cero tabs". El framing "analytics de progreso" REPELE ("I don't
  have time to be tracking granular data").
- **COGS por clase de 1 h**: ~$0.15 con Gemini Flash audio directo
  (transcribe+resume en una pasada); ~$0.20-0.38 con Whisper/Deepgram + LLM;
  ~$0.05 self-hosted a escala. Profe de 60 clases/mes ≈ $9/mes de COGS.
- **Pricing ancla**: Fathom $15, Otter $17, TutorBird $15. → Pro $12-15/mes
  con horas incluidas en el plan gratis (cap) para que el COGS no coma el
  margen.
- **Legal mínimo**: checkbox de consentimiento al agendar + banner al grabar
  + borrar audio tras transcribir (retener solo transcript/resumen). Menores:
  consentimiento del acudiente. Colombia: Ley 1581/2012 (habeas data).

## 5 · Recompensas (lo que retiene supply, probado)

Funciona lo económico-verificable (Fiverr: cobro más rápido; DoorDash:
prioridad de demanda; Airbnb: bono cash trimestral). El badge solo genera
cinismo (Preply Super Tutor = "a useless badge", top comment r/Preply).
Nuestra comisión ya es mínima → no regalar comisión; regalar lo que cuesta
poco y vale mucho:

1. **Cobro Relámpago** (≥30 h/mes): 2 retiros/mes con fee cubierto +
   prioridad. Costo $3-6/mes por profe del tier.
2. **Pro Gratis por Volumen** (≥40 h/mes): copiloto Pro gratis mientras haya
   actividad, con 2 meses de gracia al caer (jamás cliff). Costo = COGS
   $6-10/mes; valor percibido $15. **Es la recompensa que se autofinancia**:
   subir de 25 a 40 h genera +$26/mes de comisión.
3. **Bono Constancia** (3 meses ≥25 h + rating ≥4.7): $25 USDC trimestrales,
   pagados on-chain en fecha fija. ~6% del ingreso que genera ese profe.

Reglas duras: criterios 100% públicos y auditables en el dashboard,
degradación gradual (nunca "1 fallo = 3 meses sin estatus" — la queja #1 de
Preply), y JAMÁS lanzar un beneficio junto a una subida de fee (error italki).

## 6 · B2B — entrenamiento AI para BPOs bilingües

Whitespace confirmado: nadie hace roleplay de INGLÉS en el contexto de la
campaña para agentes BPO en LATAM (SymTrain/Zenarate/Solidroad entrenan
skills, no idioma; ELSA solo pronunciación). Los BPOs ya compran la categoría
(Teleperformance→Second Nature; PartnerHero→Solidroad, −50% onboarding).
Economía del cliente: premium ~2x por inglés B2+ en Colombia (COP 2.3-3.2M vs
SMLV 1.42M), ~$7.500/agente de training, 35% de fuga en 90 días. Pricing
viable ~$20-50/agente/mes. Piloto: 4 semanas, una campaña, ≤20 agentes,
medir ramp-up + QA + confianza. TODA la evidencia de impacto es
vendor-claimed — medir el piloto propio.

## 7 · Roadmap propuesto (cada fase = su feature-loop)

1. **Copiloto MVP** (resumen + plan próxima clase + página por alumno) sobre
   las clases que los profes YA dan — antes del 7-sep si es posible. El chat
   de ideas, después.
2. **Cobro real en la plataforma**: enlaces de pago sobre la tubería
   intent/status existente (pangea-wallet), suscripciones de alumnos.
3. **Retiros**: cotizar MoneyGram Ramps + Decaf + Rain (los 3 números que
   faltan), integrar el primero que dé economics.
4. **Recompensa B** (Pro gratis por volumen) al tener cohorte que la sienta.
5. **Piloto B2B** con un BPO de Medellín (una campaña, 20 agentes).

## 8 · Riesgos top

1. **Cold-start del marketplace**: Preply vende DEMANDA (~19M visitas/mes),
   no pagos. Empezar como herramienta del profe con alumnos propios
   ("Calendly+Stripe+copiloto del profe"), no como marketplace.
2. **Ventaja vs italki delgada y copiable** — el moat es nicho + copiloto +
   velocidad, no el fee.
3. **Unit economics**: $60-70/profe-activo/mes de comisión → se necesitan
   ~150+ profes activos para $10K MRR; la suscripción Pro y el B2B no son
   opcionales, son el modelo.
4. **Rails jóvenes y opacos**: sin cotización firmada de MoneyGram/Decaf/Rain
   no hay modelo de costos serio. Límite 2.500 USDC/día del cash-out.
5. **Dos negocios a la vez con un fundador solo** (consumer + B2B SaaS).
6. **Bobbin standalone 7-sep-2026** — la ventana del copiloto.

## 9 · Números sin verificar que importan (acción directa)

| Dato | Acción |
|---|---|
| Fees de MoneyGram Ramps por corredor | Registrarse en developer.moneygram.com y cotizar |
| Pricing real de Decaf (API/links a escala) | Escribir a Decaf (contacto existente) |
| Pricing de Rain (tarjeta white-label) | Pedir demo |
| italki ~21% (2026) | Confirmar con capturas de 2-3 profes activos |
| Processing fee de Preply al alumno (~18% primera lección) | Checkout de prueba |
