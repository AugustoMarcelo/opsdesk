import { db } from './client';
import { users } from './schema';

async function main() {
  const result = await db.select().from(users).limit(1);

  if (result.length === 0) {
    console.log('true');
  } else {
    console.log('false');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
