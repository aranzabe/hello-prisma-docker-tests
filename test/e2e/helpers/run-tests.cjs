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
