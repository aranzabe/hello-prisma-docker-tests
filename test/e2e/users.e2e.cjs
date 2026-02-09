const request = require('supertest');
const { prisma } = require('./helpers/prisma-test-client.cjs');
const { describe, it } = require('./helpers/test-runner.cjs');
const kleur = require('kleur');

async function runUsersTests(BASE_URL) {
  await describe(kleur.blue('---- Tests: Users API (E2E) ----'), async () => {
    let userId;

    // *** Modificaciones: POST, PATCH, DELETE ***
    await describe(kleur.magenta('Modifications'), async () => {

      await prisma.user.deleteMany();


      //--- POST ---
      await it('POST /users', async () => {
        const res = await request(BASE_URL)
          .post('/users')
          .send({ email: 'e2e@test.com', name: 'E2E User' })
          .expect(201);

        userId = res.body.id;
        if (!userId) throw new Error(kleur.red('POST /users did not return id'));

        console.log(kleur.green('✔ POST /users'));
      });

      //--- PATCH ---
      await it('PATCH /users/:id', async () => {
        const res = await request(BASE_URL)
          .patch(`/users/${userId}`)
          .send({ name: 'Updated Name' })
          .expect(200);

        const updated = await prisma.user.findUnique({ where: { id: userId } });
        if (updated.name !== 'Updated Name') throw new Error(kleur.red('User not updated'));

        console.log(kleur.green('✔ PATCH /users/:id'));
      });

      // --- DELETE ---
      await it('DELETE /users/:id', async () => {
        await request(BASE_URL)
          .delete(`/users/${userId}`)
          .expect(200);

        const deleted = await prisma.user.findUnique({ where: { id: userId } });
        if (deleted !== null) throw new Error(kleur.red('User not deleted'));

        console.log(kleur.green('✔ DELETE /users/:id'));
      });

    });

    // **** Lecturas: GET ****
    await describe(kleur.magenta('Reads'), async () => {

      //--- GET ---
      await it('GET /users', async () => {
        const user = await prisma.user.create({
          data: { email: 'read@test.com', name: 'Read User' },
        });
        userId = user.id;

        const res = await request(BASE_URL).get('/users').expect(200);
        if (!Array.isArray(res.body)) throw new Error(kleur.red('GET /users did not return an array'));

        console.log(kleur.green('✔ GET /users'));
      });

      //--- GEt /:id ---
      await it('GET /users/:id', async () => {
        const res = await request(BASE_URL)
          .get(`/users/${userId}`)
          .expect(200);

        if (res.body.id !== userId) throw new Error(kleur.red('GET /users/:id returned wrong user'));

        console.log(kleur.green('✔ GET /users/:id'));
      });

    });

  });

  console.log(kleur.blue('✅   ---- Tests: Users E2E OK ----\n'));
}

module.exports = { runUsersTests };





// const request = require('supertest');
// const { prisma } = require('./prisma-test-client.cjs');

// async function runUsersTests(BASE_URL) {
//   console.log('\n▶ Users E2E');

//   await prisma.post.deleteMany();
//   await prisma.user.deleteMany();

//   const createRes = await request(BASE_URL)
//     .post('/users')
//     .send({ email: 'e2e@test.com', name: 'E2E User' })
//     .expect(201);

//   const userId = createRes.body.id;
//   console.log('✔ POST /users');

//   await request(BASE_URL).get('/users').expect(200);
//   console.log('✔ GET /users');

//   await request(BASE_URL)
//     .patch(`/users/${userId}`)
//     .send({ name: 'Updated Name', email: 'e2e@test.com' })
//     .expect(200);
//   console.log('✔ PATCH /users/:id');

//   await request(BASE_URL).delete(`/users/${userId}`).expect(200);
//   console.log('✔ DELETE /users/:id');

//   const deleted = await prisma.user.findUnique({ where: { id: userId } });
//   if (deleted !== null) throw new Error('User not deleted');

//   console.log('✅ Users E2E OK\n');
// }

// module.exports.runUsersTests = runUsersTests;
