import assert from 'node:assert/strict';
import test from 'node:test';

import { construirPromptIdea, construirPromptResumen, extraerJson, validarResumen } from '../api/_copiloto.js';

/* El copiloto vive o muere por dos cosas puras: que el prompt lleve el
   contexto correcto y que el parser NUNCA acepte una respuesta a medias
   (mejor error claro y reintento que una sesión guardada sin ideas). */

const RESPUESTA_LIMPIA = JSON.stringify({
  titulo: 'Reported speech con noticias',
  resumen: ['Practicaron reported speech', 'Dudó en presente perfecto'],
  vocab: ['bottleneck', 'meanwhile'],
  ideas: ['News recap de 5 min', 'Role-play con proveedor', 'Reto anti-muletilla'],
  foco: ['Reported speech en presente perfecto'],
});

test('extraerJson: JSON limpio', () => {
  const obj = extraerJson(RESPUESTA_LIMPIA);
  assert.equal(obj.titulo, 'Reported speech con noticias');
});

test('extraerJson: JSON envuelto en fence markdown y prosa', () => {
  const texto = 'Claro, aquí está el resumen:\n```json\n' + RESPUESTA_LIMPIA + '\n```\n¡Éxitos con la clase!';
  const obj = extraerJson(texto);
  assert.equal(obj.ideas.length, 3);
});

test('extraerJson: basura devuelve null, no explota', () => {
  assert.equal(extraerJson('no hay json por ninguna parte'), null);
  assert.equal(extraerJson('{rota'), null);
  assert.equal(extraerJson(undefined), null);
});

test('validarResumen: acepta el shape completo y recorta strings largos', () => {
  const obj = JSON.parse(RESPUESTA_LIMPIA);
  obj.vocab.push('x'.repeat(1000));
  const v = validarResumen(obj);
  assert.ok(v);
  assert.ok(v.vocab.at(-1).length <= 400);
});

test('validarResumen: rechaza llaves faltantes — nunca una sesión a medias', () => {
  const sinIdeas = JSON.parse(RESPUESTA_LIMPIA);
  delete sinIdeas.ideas;
  assert.equal(validarResumen(sinIdeas), null);
  assert.equal(validarResumen(null), null);
  assert.equal(validarResumen({ titulo: '' }), null);
});

test('validarResumen: coerciona string suelto a arreglo (modelos que devuelven "foco" plano)', () => {
  const obj = JSON.parse(RESPUESTA_LIMPIA);
  obj.foco = 'Reported speech';
  const v = validarResumen(obj);
  assert.deepEqual(v.foco, ['Reported speech']);
});

test('construirPromptResumen: lleva nombre, transcript e historial, y prohíbe corregir al profe', () => {
  const msgs = construirPromptResumen({
    nombre: 'Sofía',
    detalle: 'Inglés B2',
    transcript: 'Hello, how was your week?',
    historial: ['Clase 1: pasado simple'],
  });
  assert.equal(msgs.length, 2);
  assert.match(msgs[0].content, /NO evalúes ni corrijas al profesor/);
  assert.match(msgs[1].content, /Sofía/);
  assert.match(msgs[1].content, /how was your week/);
  assert.match(msgs[1].content, /pasado simple/);
});

test('construirPromptIdea: sin historial lo dice en vez de inventar', () => {
  const msgs = construirPromptIdea({ nombre: 'Kenji', detalle: '', pregunta: '¿Qué repasamos?', historial: [] });
  assert.match(msgs[1].content, /Todavía no hay clases resumidas/);
});
