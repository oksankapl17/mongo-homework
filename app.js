'use strict';
const {mapUser, mapArticle, getRandomFirstName} = require('./util');
// db connection and settings
const connection = require('./config/connection');

let userCollection;
async function run() {
  await connection.connect();
  const users = connection.get().collection('users');
  if (users) {
    await connection.get().dropCollection('users');
  }
  userCollection = await connection.get().createCollection('users');

  await example1();
  await example2();
  await example3();
  await example4();
  // await connection.close();
}
// run();

// #### Users

// - Create 2 users per department (a, b, c)
async function example1() {
  try {
    const departments = ['a', 'a', 'b', 'b', 'c', 'c'];
    return await Promise.all(
      departments.map(department =>
        userCollection.insertMany([mapUser({department}), mapUser({department})])
      )
    );
  } catch (e) {
    console.error(e);
  }
}

// - Delete 1 user from department (a)
async function example2() {
  try {
    const {result} = await userCollection.deleteOne({department: 'a'});
    console.log(`Removed ${result.n} user`);
  } catch (e) {
    console.error(e);
  }
}

// - Update firstName for users from department (b)
async function example3() {
  try {
    const usersB = await userCollection.find({department: 'b'}).toArray();
    const bulkWrite = usersB.map(user => ({
      updateOne: {
        filter: {_id: user._id},
        update: {$set: {firstName: getRandomFirstName()}}
      }
    }));

    const {result} = await userCollection.bulkWrite(bulkWrite);
    console.log(`Updated ${result.nModified} users`);
  } catch (e) {
    console.error(e);
  }
}

// - Find all users from department (c)
async function example4() {
  try {
    const users = await userCollection.find({department: 'c'}).toArray();
    console.log(`Found ${users.length} users`);
  } catch (e) {
    console.error(e);
  }
}

// #### Articles
let articleCollection;

async function run2() {
  try {
    await connection.connect();
    const articles = connection.get().collection('articles');
    if (articles) {
      await connection.get().dropCollection('articles');
    }
    articleCollection = await connection.get().createCollection('articles');

    await createArticles();
    await findTypedArticles();
    await updateArticlesTags();
    await findNewTags();
    await pullTags();
    // await connection.close();
  } catch (e) {
    console.log(e);
  }
}
// run2();
//Create 5 articles per each type (a, b, c)
async function createArticles() {
  try {
    const types = ['a', 'b', 'c'];
    const articles = types
      .map(t => Array.from({length: 5}, (v, k) => k).map(() => mapArticle({type: t})))
      .flat();
    const {result} = await articleCollection.insertMany(articles);
    console.log(`Added ${result.n} articles`);
  } catch (e) {
    console.error(e);
  }
}

// Find articles with type a, and update tag list with next value [‘tag1-a’, ‘tag2-a’, ‘tag3’]
async function findTypedArticles() {
  try {
    return await articleCollection.updateMany(
      {type: 'a'},
      {
        $set: {
          'tags.0': 'tag1-a',
          'tags.1': 'tag2-a',
          'tags.2': 'tag3'
        }
      }
    );
  } catch (e) {
    console.error(e);
  }
}

// Add tags [‘tag2’, ‘tag3’, ‘super’] to other articles except articles from type a
async function updateArticlesTags() {
  try {
    return await articleCollection.updateMany(
      {type: {$not: /^a/}},
      {
        $set: {
          'tags.0': 'tag2',
          'tags.1': 'tag3',
          'tags.2': 'super'
        }
      }
    );
  } catch (e) {
    console.error(e);
  }
}

//  Find all articles that contains tags [tag2, tag1-a]
async function findNewTags() {
  try {
    return await articleCollection.find({tags: {$in: [/^tag2/i, /^tag1-a/]}}).toArray();
  } catch (e) {
    console.error(e);
  }
}

// Pull [tag2, tag1-a] from all articles
async function pullTags() {
  try {
    return await articleCollection.updateMany(
      {},
      {$pull: {tags: {$in: ['tag2', 'tag1-a']}}},
      {multi: true}
    );
  } catch (e) {
    console.error(e);
  }
}

// #### Students
let studentsCollection;

async function run3() {
  try {
    await connection.connect();
    const students = connection.get().collection('students');
    if (!students) {
      throw new Error('Collection not found!');
    }
    studentsCollection = students;
    await findWorst();
    await connection.close();
  } catch (e) {
    console.log(e);
  }
}

run3();

// Find all students who have the worst score for homework, sort by descent
async function findWorst() {
  try {
    const search = await studentsCollection.aggregate([
      {$unwind: '$scores'},
      {
        $match: {
          'scores.type': 'homework'
        }
      },
      {
        $group: {
          _id: '$_id',
          min_score: {$min: '$scores.score'}
        }
      },
      {
        $sort: {
          min_score: -1
        }
      }
    ]);
    const doc = search.hasNext() ? await search.next() : null;
    console.log({doc});
  } catch (e) {
    console.error(e);
  }
}
