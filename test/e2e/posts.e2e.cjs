const request = require('supertest');
const { prisma } = require('./helpers/prisma-test-client.cjs');
const { describe, it } = require('./helpers/test-runner.cjs');
const kleur = require('kleur');

async function runPostsTests(BASE_URL) {
  await describe(kleur.blue('---- Tests: Posts API (E2E) ----'), async () => {
    let userId;
    let postId;

    // *** Modificaciones: POST, PATCH, DELETE ***
    await describe(kleur.magenta('Modifications'), async () => {

      await prisma.post.deleteMany();
      await prisma.user.deleteMany();


      //----- POST ----
      await it('POST /posts', async () => {
        const user = await prisma.user.create({
          data: { email: 'post@test.com', name: 'Post User' },
        });
        userId = user.id;

        const res = await request(BASE_URL)
          .post('/posts')
          .send({ title: 'E2E Post', content: 'Content', authorId: userId })
          .expect(201);

        postId = res.body.id;
        if (!postId) throw new Error(kleur.red('POST /posts did not return id'));

        console.log(kleur.green('✔ POST /posts'));
      });

      //---- PATCH ----
      await it('PATCH /posts/:id', async () => {
        await request(BASE_URL)
          .patch(`/posts/${postId}`)
          .send({ title: 'Updated Post' })
          .expect(200);

        const updated = await prisma.post.findUnique({ where: { id: postId } });
        if (updated.title !== 'Updated Post') throw new Error(kleur.red('Post not updated'));

        console.log(kleur.green('✔ PATCH /posts/:id'));
      });

      //---- DELETE ----
      await it('DELETE /posts/:id', async () => {
        await request(BASE_URL).delete(`/posts/${postId}`).expect(200);

        const deleted = await prisma.post.findUnique({ where: { id: postId } });
        if (deleted !== null) throw new Error(kleur.red('Post not deleted'));

        console.log(kleur.green('✔ DELETE /posts/:id'));
      });

    });

    // **** Lecturas: GET ****
    await describe(kleur.magenta('Reads'), async () => {

      //---- GET ----
      await it('GET /posts', async () => {
        const res = await request(BASE_URL).get('/posts').expect(200);

        if (!Array.isArray(res.body)) throw new Error(kleur.red('GET /posts did not return an array'));

        console.log(kleur.green('✔ GET /posts'));
      });

      //---- Get /:id ----
      await it('GET /posts/:id', async () => {
        // Creamos un post base solo para lectura
        const post = await prisma.post.create({
          data: { title: 'Base Post', content: 'Content', authorId: userId },
        });

        const res = await request(BASE_URL).get(`/posts/${post.id}`).expect(200);

        if (res.body.id !== post.id) throw new Error(kleur.red('GET /posts/:id returned wrong post'));
        console.log(kleur.green('✔ GET /posts/:id'));
      });

    });

  });

  console.log(kleur.blue('✅  ---- Tests: Posts E2E OK ----\n'));
}

module.exports = { runPostsTests };








// const request = require('supertest');
// const { prisma } = require('./prisma-test-client.cjs');

// async function runPostsTests(BASE_URL) {
//   console.log('\n▶ Posts E2E');

//   await prisma.post.deleteMany();
//   await prisma.user.deleteMany();

//   const user = await prisma.user.create({
//     data: { email: 'post@test.com', name: 'Post User' },
//   });
//   const userId = user.id;

//   const post = await prisma.post.create({
//     data: { title: 'Base Post', content: 'Content', authorId: userId },
//   });
//   const postId = post.id;

//   await request(BASE_URL)
//     .post('/posts')
//     .send({ title: 'E2E Post', content: 'Content', authorId: userId })
//     .expect(201);
//   console.log('✔ POST /posts');

//   await request(BASE_URL).get('/posts').expect(200);
//   console.log('✔ GET /posts');

//   await request(BASE_URL)
//     .patch(`/posts/${postId}`)
//     .send({ title: 'Updated Post' })
//     .expect(200);
//   console.log('✔ PATCH /posts/:id');

//   await request(BASE_URL)
//     .delete(`/posts/${postId}`)
//     .expect(200);
//   console.log('✔ DELETE /posts/:id');

//   const deleted = await prisma.post.findUnique({ where: { id: postId } });
//   if (deleted !== null) throw new Error('Post not deleted');

//   console.log('✅ Posts E2E OK\n');
// }

// module.exports.runPostsTests = runPostsTests;
