import * as Toggl from 'toggl-api';
import * as traverse from 'traverse';
import * as admin from 'firebase-admin';
import { merge, max, values } from 'ramda';

const PAST_DAYS = 14;

function stringToColor(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  var colour = '#';
  for (var i = 0; i < 3; i++) {
    var value = (hash >> (i * 8)) & 0xFF;
    colour += ('00' + value.toString(16)).substr(-2);
  }
  return colour;
}

function buildUsers(data) {
  const r = {}
  values(data).forEach(v => {
    r[v['togglUid']] = {
      name: v['initials'],
      color: v['color'] || stringToColor(v['fullName'])
    }
  })
  return r;
}

function getUsers(): admin.Promise<any> {
  admin.initializeApp({
    credential: admin.credential.cert('./firebase.json'),
    databaseURL: 'https://sparks-bi.firebaseio.com',
  })

  const db = admin.database()

  return db.ref('/teamMembers').once('value').then(snap => buildUsers(snap.val()))
}

function buildProjectTimes(data: Array<Object>) {
  // console.error('pt data', JSON.stringify(data, null, 2))
  const r = {}
  data.forEach(p => r[p['id']] = p)
  return r;
}

function getProjectTimes(): Promise<any> {
  const t = new Toggl({apiToken: process.env.TOGGL_API_TOKEN});
  const since = new Date(Date.now() + -PAST_DAYS*24*3600*1000).toISOString().substr(0,10)
  console.error('since', since)
  return new Promise(resolve => t.summaryReport({
    workspace_id: process.env.TOGGL_WORKSPACE_ID,
    grouping: 'projects',
    subgrouping: 'users',
    subgrouping_ids: true,
    since,
    // since: since.toISOString().substr(0,6),
  // }, (err, result) => console.error(JSON.stringify(result, null, 2))));
  }, (err, result) => resolve(buildProjectTimes(result.data))));
}

const s = require('./struct.json');

Promise.all([
  getUsers(),
  getProjectTimes(),
]).then(([users, projectTimes]) => {
  // console.log('users',users);
  // console.error('pt', JSON.stringify(projectTimes, null, 2));
  console.log(JSON.stringify(buildTree(s, users, projectTimes), null, 2));
  process.exit();
})

function childFromRow(users, row) {
  const u = users[row.ids] || {name: 'NA', color: '#666'}
  return merge(u, {size: row.time / (60 * 1000)})
}

function buildTree(struct, users, projectTimes) {
  const mapped = traverse(struct).map(function(n) {
    if (!n || !n.pid) { return; }
    n.isContainer = true;
    if (!n.children) { n.children = [] }
    const pri = {
      name: n.name,
      isPrimary: true,
      children: [],
    }
    if (projectTimes[n.pid]) {
      // pri.children = pri.children.concat(projectTimes[n.pid].details.map(r => childFromRow(users, r)))
      pri.children = pri.children.concat(projectTimes[n.pid].items.map(r => childFromRow(users, r)))
    }
    const label = {
      name: n.name,
      isLabel: true,
      size: 1,
      // size: max(pri.children.reduce((acc,x) => acc + x['size'], 0),1),
    }
    pri.children.push(label)
    n.children.push(pri)
    this.update(n);
  })

  return mapped;
}
