


## **1️⃣ Tipos de tests en NestJS**

En NestJS (y en general en Node.js), solemos hablar de **tres tipos principales de tests**:

| Tipo                  | Qué prueba                                                                              | Herramientas típicas                                    | Cuándo usar                                                                         |
| --------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Unit tests**        | Prueban una unidad de código aislada (servicio, función).                               | Jest, Vitest                                            | Para lógica interna. Son rápidos y fáciles de mantener.                             |
| **Integration tests** | Prueban la interacción entre varias unidades (p. ej., servicio + repositorio).          | Jest, Vitest, Supertest                                 | Para verificar que varias piezas trabajan juntas.                                   |
| **E2E (End-to-End)**  | Prueban toda la aplicación desde el punto de entrada (HTTP API) hasta la base de datos. | Supertest + scripts NodeJS (sin Jest/Vitest en tu caso) | Garantizan que toda la app funciona como se espera. Más lentos pero más confiables. |

✅ **Por qué los E2E son más usados en tu caso:**

* Prisma 7 tiene problemas con Jest y Vitest por incompatibilidad CJS/ESM.
* Quieres probar la API completa (HTTP, validaciones, DB) y no solo funciones aisladas.
* Funcionan igual en local, en CI/CD y en Docker.

---

## **2️⃣ CI / CD**

**Objetivo:** que los tests se ejecuten automáticamente al hacer deploy o push.

* **CI (Continuous Integration)**:

  * Cada vez que haces push a tu repositorio, se levantan los tests automáticamente.
  * Detecta errores antes de fusionar código.

* **CD (Continuous Delivery/Deployment)**:

  * Si los tests pasan, el código puede desplegarse automáticamente a staging o producción.

**Con tu enfoque de E2E con scripts NodeJS y Docker:**

* Se monta un **contenedor de base de datos de pruebas** (Postgres).
* Se levanta la **app en modo test** (`NODE_ENV=test`).
* Se ejecutan los **scripts E2E** directamente con NodeJS, sin Jest/Vitest.
* Salida: exit code `0` si todo pasó, `1` si falla algún test.
* Ideal para pipelines en GitHub Actions, GitLab CI, etc.

---

## **3️⃣ Problemas de Prisma 7 con Jest / Vitest**

* Prisma 7 genera código **ESM**, mientras que Jest/Vitest (según la configuración) usa **CJS** por defecto.
* Transformaciones y compatibilidad (`transformMode`, `tsconfig-paths`, etc.) fallan constantemente.
* Por eso este enfoque es **scripts NodeJS puros con CommonJS**:

```js
require('dotenv/config');
const { PrismaClient } = require('../../../generated/prisma2');
const { PrismaPg } = require('@prisma/adapter-pg');

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://postgres:test@localhost:5434/ejemploPrisma_test?schema=public',
  }),
});

module.exports.prisma = prisma; 
```

✅ Ventajas:

* Cero dependencias de Jest/Vitest.
* Compatible con Docker y Prisma 7.
* Permite escribir tests **end-to-end** completos con `supertest`.

---

## **4️⃣ Estructura de tests E2E con scripts JS**

### **Runner global**

```js
require('dotenv/config');

const { runUsersTests } = require('../users.e2e.cjs');
const { runPostsTests } = require('../posts.e2e.cjs');

(async () => {
  try {
    const BASE_URL = process.env.API_URL || 'http://localhost:3000';

    await runUsersTests(BASE_URL);
    await runPostsTests(BASE_URL);

    console.log('\n🎉 ALL E2E TESTS PASSED');
    process.exit(0);
  } catch (err) {
    console.error('❌ E2E TEST FAILED\n', err);
    process.exit(1);
  }
})();
```

---

### **Mini-framework de tests**

```js
async function describe(name, fn) {
  console.log(`\n🧪 ${name}`);
  await fn();
}

async function it(name, fn) {
  try {
    await fn();
    console.log(`  ✔ ${name}`);
  } catch (err) {
    console.error(`  ✖ ${name}`);
    throw err;
  }
}

module.exports = { describe, it };
```

✅ Beneficios:

* Compatible con CommonJS.
* Funciona en Docker.
* Compatible con Prisma 7.
* Permite agrupar tests por `describe` y `it` como Jest/Vitest, pero **sin usarlos**.

---

### **Ejemplo de test Posts**

```js
const request = require('supertest');
const kleur = require('kleur');
const { prisma } = require('./helpers/prisma-test-client.cjs');
const { describe, it } = require('./helpers/test-runner.cjs');

async function runPostsTests(BASE_URL) {
  let userId, postId;

  await describe('Posts API (E2E)', async () => {
    await it('POST /posts', async () => {
      await prisma.post.deleteMany();
      await prisma.user.deleteMany();

      const user = await prisma.user.create({
        data: { email: 'post@test.com', name: 'Post User' },
      });
      userId = user.id;

      const res = await request(BASE_URL)
        .post('/posts')
        .send({ title: 'E2E Post', content: 'Content', authorId: userId })
        .expect(201);
      postId = res.body.id;

      console.log(kleur.green('✔ POST /posts'));
    });

    await describe('🧪 Reads', async () => {
      await it('GET /posts', async () => {
        const res = await request(BASE_URL).get('/posts').expect(200);
        if (!Array.isArray(res.body)) throw new Error('GET /posts did not return an array');
        console.log(kleur.green('✔ GET /posts'));
      });

      await it('GET /posts/:id', async () => {
        // Creamos un post separado para lectura
        const post = await prisma.post.create({
          data: { title: 'Base Post', content: 'Content', authorId: userId },
        });

        const res = await request(BASE_URL).get(`/posts/${post.id}`).expect(200);
        if (res.body.id !== post.id) throw new Error(kleur.red('GET /posts/:id returned wrong post'));
        console.log(kleur.green('✔ GET /posts/:id'));
      });
    });

    await describe('🧪 Modifications', async () => {
      await it('PATCH /posts/:id', async () => {
        await request(BASE_URL)
          .patch(`/posts/${postId}`)
          .send({ title: 'Updated Post' })
          .expect(200);

        const updated = await prisma.post.findUnique({ where: { id: postId } });
        if (updated.title !== 'Updated Post') throw new Error(kleur.red('Post was not updated'));
        console.log(kleur.green('✔ PATCH /posts/:id'));
      });

      await it('DELETE /posts/:id', async () => {
        await request(BASE_URL).delete(`/posts/${postId}`).expect(200);
        const deleted = await prisma.post.findUnique({ where: { id: postId } });
        if (deleted !== null) throw new Error(kleur.red('Post not deleted'));
        console.log(kleur.green('✔ DELETE /posts/:id'));
      });
    });
  });
}

module.exports = { runPostsTests };
```

---

## **5️⃣ Cómo lanzarlos en Docker**

**docker-compose.yml**

```yaml
services:
  db:
    image: postgres:17-alpine
    container_name: ejemploPrisma-test-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: test
      POSTGRES_DB: ejemploPrisma_test
    ports:
      - "5434:5432"
    volumes:
      - test_db_data:/var/lib/postgresql/data

  app:
    build: .
    container_name: ejemploPrisma-test-app
    command: sh ./test-entrypoint.sh
    environment:
      DATABASE_URL: postgresql://postgres:test@db:5432/ejemploPrisma_test
      NODE_ENV: test
    depends_on:
      - db
    volumes:
      - .:/app

volumes:
  test_db_data:
```

**test-entrypoint.sh**

```sh
#!/bin/sh
echo "Running E2E tests..."
node test/e2e/run-all-tests.cjs
```
En ***package.json*** tendremos:
```
  "scripts": {
    "seed": "node prisma/seeds/seed.cjs",
    "start": "node dist/main.js",
    "start:dev": "nest start --watch",
    "build": "nest build",
    "test": "node test/e2e/helpers/run-tests.cjs",
    "test:e2e": "node test/e2e/helpers/run-tests.cjs"
  },
```

Para lanzar la app podemos hacerlo en modo desarrollo:
```
docker compose -f docker-compose.dev.yml up --build
```

y en modo tests:
```
docker compose -f docker-compose.test.yml up --abort-on-container-exit
````

Qué hace ***--abort-on-container-exit***:

Por defecto, docker compose up mantiene los contenedores corriendo aunque uno de ellos termine.

Con --abort-on-container-exit:

- Docker va a monitorear todos los contenedores del docker-compose.test.yml.

- Si algún contenedor termina (exit 0 o con error), Docker detiene todos los demás contenedores automáticamente.

- Esto es ideal para E2E porque:

    - Tu contenedor app corre el script de tests (test-entrypoint.sh).

    - Cuando los tests terminan, el contenedor hace process.exit(0) o process.exit(1).

    - Docker detecta que terminó y automáticamente apaga la base de datos y cualquier otro contenedor auxiliar.

    - Resultado: no tienes que detener manualmente los contenedores.

✅ Lanzando los tests así consigues:

* Levantas Postgres y app en modo test.
* Corres tus scripts E2E puros con NodeJS.
* Compatible con CI/CD y Prisma 7.

---

Curiosidad: 
Dentro del archivo ***docker-compose.test.yml*** prueba a comentar y descomentar estas líneas, alternativamente:
```
    command: sh ./test-entrypoint.sh
    # command: sh -c "yarn set version stable && yarn prisma generate && yarn prisma migrate dev && yarn start:dev"
```
Si lanzas el docker sin **entrypoint** se queda en ejecución y así podrás comprobar como se trabaja en una base de datos de test gemela a la de desarrollo. 
![alt text](image-1.png)

No funcionará la app porque ***node_modules*** no se carga.

---

## **6️⃣ Resumen de pasos para crear tests**

1. Crear **scripts E2E** con CommonJS (`require`) y `supertest`.
2. Crear un mini-runner (`describe`/`it`) para agrupar y colorear tests.
3. Usar **PrismaClient** directamente en los tests para limpiar DB y crear datos. Usamos 'prisma2'.
4. Separar **tests de lectura** y **tests de modificación**, evitando conflictos de IDs borrados.
5. Colorear mensajes con `kleur` para legibilidad en consola.
6. Ejecutar los tests desde **Docker** para CI/CD.

