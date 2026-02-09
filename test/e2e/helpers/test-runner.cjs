async function describe(name, fn) {
  console.log(`\n🧪 ${name}`);
  await fn();
}

async function it(name, fn) {
  try {
    await fn();
    //console.log(`  ✔ ${name}`);
  } catch (err) {
    //console.error(`  ✖ ${name}`);
    throw err;
  }
}

module.exports = { describe, it };

/*
✔ cero dependencias
✔ compatible con CommonJS
✔ compatible con Prisma 7
✔ funciona en Docker / local
*/