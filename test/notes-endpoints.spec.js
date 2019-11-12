const knex = require('knex');
const app = require('../src/app');
const { makeNotesArray, makeMaliciousNote } = require('./notes.fixtures');
const { makeFoldersArray } = require('./folders.fixtures');

describe.only('Notes Endpoints', () => {
    let db;
    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DATABASE_URL
        });
        app.set('db', db);
    })
    after('disconnect from db', () => db.destroy());
    before('clean the table', () => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'));
    afterEach('cleanup', () => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'));

    describe('GET /api/notes', () => {
        context('Given no notes', () => {
            it('responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/api/notes')
                    .expect(200, []);
            });
        });
        context('Given there are notes in db', () => {
            const testFolders = makeFoldersArray();
            const testNotes = makeNotesArray();
            beforeEach('insert notes', () => {
                return db
                    .insert(testFolders)
                    .into('folders')
                    .then(() => {
                        return db
                            .insert(testNotes)
                            .into('notes');
                    });
            });
            it('responds with 200 and all notes', () => {
                return supertest(app)
                    .get('/api/notes')
                    .expect(200, testNotes);
            });
        });
        context('Given a XSS attack note', () => {
            const testFolders = makeFoldersArray();
            const { maliciousNote, expectedNote } = makeMaliciousNote();
            beforeEach('insert malicious content', () => {
                return db
                    .insert(testFolders)
                    .into('folders')
                    .then(() => {
                        return db
                            .insert(maliciousNote)
                            .into('notes');
                    });
            });
            it('removes XSS attack content', () => {
                return supertest(app)
                    .get('/api/notes')
                    .expect(200)
                    .expect(res => {
                        expect(res.body[0].name).to.eql(expectedNote.name);
                        expect(res.body[0].content).to.eql(expectedNote.content);
                    });
            });
        });
    });
    describe('GET /api/notes/:note_id', () => {
        context('Given no notes', () => {
            it('responds with 404', () => {
                const noteId = 1234;
                return supertest(app)
                    .get(`/api/notes/${noteId}`)
                    .expect(404, {
                        error: { message: `Note doesn't exist` }
                    });
            });
        });
        context('Given there are notes in db', () => {
            const testFolders = makeFoldersArray();
            const testNotes = makeNotesArray();
            beforeEach('insert notes', () => {
                return db
                    .insert(testFolders)
                    .into('folders')
                    .then(() => {
                        return db
                            .insert(testNotes)
                            .into('notes');
                    });
            });
            it('responds with 200 and the specified note', () => {
                const noteId = 2;
                const expectedNote = testNotes[noteId - 1];
                return supertest(app)
                    .get(`/api/notes/${noteId}`)
                    .expect(200, expectedNote);
            });
        });
        context('Given a XSS attack note', () => {
            const testFolders = makeFoldersArray();
            const { maliciousNote, expectedNote } = makeMaliciousNote();
            beforeEach('insert malicious content', () => {
                return db
                    .insert(testFolders)
                    .into('folders')
                    .then(() => {
                        return db
                            .insert(maliciousNote)
                            .into('notes');
                    });
            });
            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/api/notes/${maliciousNote.id}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.name).to.eql(expectedNote.name);
                        expect(res.body.content).to.eql(expectedNote.content);
                    });
            });
        });
    });
    describe('POST /api/notes', () => {
        const testFolders = makeFoldersArray();
        beforeEach('insert folders', () => {
            return db
                .insert(testFolders)
                .into('folders');
        });
        it('responds with 201 and the new folder', () => {
            const newFolder = {
                name: 'new folder',
                modified: new Date(),
                folderid: 1,
                content: 'new content'
            };
            return supertest(app)
                .post('/api/notes')
                .send(newFolder)
                .expect(201)
                .expect(res => {
                    expect(res.body.name).to.eql(newFolder.name);
                    expect(res.body.content).to.eql(newFolder.content);
                    expect(res.body.folderid).to.eql(newFolder.folderid);
                    expect(res.body).to.have.property('id');
                    expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`);
                    const expected = new Intl.DateTimeFormat('en-US').format(new Date());
                    const actual = new Intl.DateTimeFormat('en-US').format(new Date(res.body.modified));
                    expect(actual).to.eql(expected);
                })
                .then(postRes => {
                    supertest(app)
                        .get(`/api/notes/${postRes.body.id}`)
                        .expect(postRes.body);
                });
        });

        const requiredFields = ['name', 'folderid'];
        requiredFields.forEach(field => {
            const newNote = {
                name: 'new folder',
                folderid: 1
            };
            it(`responds with 400 and missing ${field} in request body error`, () => {
                delete newNote[field];
                return supertest(app)
                    .post('/api/notes')
                    .send(newNote)
                    .expect(400, {
                        error: { message: `Missing '${field}' in request body` }
                    });
            });
        });
        it('removes XSS attack content', () => {
            const { maliciousNote, expectedNote } = makeMaliciousNote();
            return supertest(app)
                .post('/api/notes')
                .send(maliciousNote)
                .expect(201)
                .expect(res => {
                    expect(res.body.name).to.eql(expectedNote.name);
                    expect(res.body.content).to.eql(expectedNote.content);
                });
        });
    });
    describe('DELETE /api/notes/:note_id', () => {
        context('Given no notes', () => {
            it('responds with 404', () => {
                const idToDelete = 1234;
                return supertest(app)
                    .delete(`/api/notes/${idToDelete}`)
                    .expect(404, {
                        error: { message: `Note doesn't exist` }
                    });
            });
        });
        context('Given there are notes in db', () => {
            const testFolders = makeFoldersArray();
            const testNotes = makeNotesArray();
            beforeEach('insert notes', () => {
                return db
                    .insert(testFolders)
                    .into('folders')
                    .then(() => {
                        return db
                            .insert(testNotes)
                            .into('notes');
                    });
            });
            it('responds with 204 and removes the note', () => {
                const idToRemove = 2;
                const expectedNotes = testNotes.filter(note => note.id !== idToRemove);
                return supertest(app)
                    .delete(`/api/notes/${idToRemove}`)
                    .expect(204)
                    .then(() => {
                        supertest(app)
                            .get(`/api/notes/${idToRemove}`)
                            .expect(expectedNotes);
                    });
            });
        });
    });
    describe('PATCH /api/notes/:note_id', () => {
        context('Given no notes', () => {
            it('responds with 404', () => {
                const idToUpdate = 1234;
                return supertest(app)
                    .patch(`/api/notes/${idToUpdate}`)
                    .expect(404, {
                        error: {message: `Note doesn't exist`}
                    });
            });
        });
        context('Given there are notes', () => {
            const testFolders = makeFoldersArray();
            const testNotes = makeNotesArray();
            beforeEach('insert notes', () => {
                return db
                    .insert(testFolders)
                    .into('folders')
                    .then(() => {
                        return db
                            .insert(testNotes)
                            .into('notes');
                    });
            });
            it('responds with 204 and update the note', () => {
                const idToUpdate = 2;
                const updatedNote = {
                    name: 'update note',
                    folderid: 2,
                    content: 'update content'
                };
                const expectedNote = {
                    ...testNotes[idToUpdate - 1],
                    ...updatedNote
                };
                return supertest(app)
                    .patch(`/api/notes/${idToUpdate}`)
                    .send(updatedNote)
                    .expect(204)
                    .then(() => {
                        supertest(app)
                            .get(`/api/notes/${idToUpdate}`)
                            .expect(expectedNote);
                    });
            });
            it('responds with 400 when required field missing', () => {
                const idToUpdate = 2;
                const updateNote = {
                    content: 'update content'
                };
                return supertest(app)
                    .patch(`/api/notes/${idToUpdate}`)
                    .send(updateNote)
                    .expect(400, {
                        error: {message: `Request body must contain at least either 'name', or 'folderid'`}
                    });
            });
            it('responds with 204 when updating partial note', () => {
                const idToUpdate = 2;
                const updateNote = {
                    name: 'update name',
                    content: 'update content'
                };
                const expectedNote = {
                    ...testNotes[idToUpdate - 1],
                    ...updateNote
                };
                return supertest(app)
                    .patch(`/api/notes/${idToUpdate}`)
                    .send({
                        ...updateNote,
                        fieldToIgnore: 'should not be in GET response'
                    })
                    .expect(204)
                    .then(() => {
                        supertest(app)
                            .get(`/api/notes/${idToUpdate}`)
                            .expect(expectedNote);
                    });
            });
        });
    });
});