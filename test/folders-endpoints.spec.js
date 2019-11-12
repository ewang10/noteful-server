const knex = require('knex');
const app = require('../src/app');
const { makeFoldersArray, makeMaliciousFolder } = require('./folders.fixtures');

describe('Folders Endpoints', () => {
    let db;
    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL
        });
        app.set('db', db);
    })
    after('disconnect from db', () => db.destroy());
    before('clean the table', () => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'));
    afterEach('cleanup', () => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'));

    describe('GET /api/folders', () => {
        context('Given no folders', () => {
            it('responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/api/folders')
                    .expect(200, [])
            });
        });
        context('Given there are folders in the database', () => {
            const testFolders = makeFoldersArray();
            beforeEach('insert folders', () => {
                return db
                    .insert(testFolders)
                    .into('folders');
            });
            it('responds with 200 and all of the folders', () => {
                return supertest(app)
                    .get('/api/folders')
                    .expect(200, testFolders);
            });
        });
        context('Given a XSS attack folder', () => {
            const { maliciousFolder, expectedFolder } = makeMaliciousFolder();
            beforeEach('insert malicious folder', () => {
                return db
                    .insert(maliciousFolder)
                    .into('folders');
            });
            it('removes malicious content', () => {
                return supertest(app)
                    .get('/api/folders')
                    .expect(200)
                    .expect(res => {
                        expect(res.body[0].name).to.eql(expectedFolder.name);
                    });
            });
        });
    });
    describe('GET /api/folders/:folder_id', () => {
        context('Given no folders', () => {
            it('responds with 404', () => {
                const folderId = 1234;
                return supertest(app)
                    .get(`/api/folders/${folderId}`)
                    .expect(404, {
                        error: { message: `Folder doesn't exist` }
                    });
            });
        });
        context('Given there are folders in db', () => {
            const testFolders = makeFoldersArray();
            beforeEach('insert folders', () => {
                return db
                    .insert(testFolders)
                    .into('folders');
            });
            it('responds with 200 and the specified folder', () => {
                const folderId = 2;
                const expectedFolder = testFolders[folderId - 1];
                return supertest(app)
                    .get(`/api/folders/${folderId}`)
                    .expect(200, expectedFolder);
            });
        });
        context('Given an XSS attack folder', () => {
            const { maliciousFolder, expectedFolder } = makeMaliciousFolder();
            beforeEach('insert malicious folder', () => {
                return db
                    .insert(maliciousFolder)
                    .into('folders');
            });
            it('removes malicious content', () => {
                return supertest(app)
                    .get(`/api/folders/${maliciousFolder.id}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.name).to.eql(expectedFolder.name)
                    });

            });
        });
    });
    describe('POST /api/folder', () => {
        it('creates a folder, responding with 201 and the new folder', () => {
            const newFolder = {
                name: 'new folder'
            }
            return supertest(app)
                .post('/api/folders')
                .send(newFolder)
                .expect(201)
                .expect(res => {
                    expect(res.body.name).to.eql(newFolder.name);
                    expect(res.body).to.have.property('id');
                    expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`);
                })
                .then(res => {
                    supertest(app)
                        .get(`/api/folders/${res.body.id}`)
                        .expect(res.body);
                });
        });

        it('responds with 400 and an error message when "name" is missing', () => {
            return supertest(app)
                .post('/api/folders')
                .expect(400, {
                    error: { message: `Missing 'name' in request body` }
                });
        });

        it('Given a XSS attack folder, removes XSS attack content from response', () => {
            const { maliciousFolder, expectedFolder } = makeMaliciousFolder();
            return supertest(app)
                .post('/api/folders')
                .send(maliciousFolder)
                .expect(201)
                .expect(res => {
                    expect(res.body.name).to.eql(expectedFolder.name);
                });
        });
    });
    describe('DELETE /api/folders/:folder_id', () => {
        context('Given no folders', () => {
            it('responds with 404', () => {
                const folderId = 1234;
                return supertest(app)
                    .delete(`/api/folders/${folderId}`)
                    .expect(404, {
                        error: { message: `Folder doesn't exist` }
                    });
            });
        });
        context('Given there are folders in db', () => {
            const testFolders = makeFoldersArray();
            beforeEach('insert folders', () => {
                return db
                    .insert(testFolders)
                    .into('folders');
            });
            it('responds with 204 and removes the folder', () => {
                const idToRemove = 2;
                const expectedFolders = testFolders.filter(folder => folder.id !== idToRemove);
                return supertest(app)
                    .delete(`/api/folders/${idToRemove}`)
                    .expect(204)
                    .then(() => {
                        supertest(app)
                            .get('/api/folders')
                            .expect(expectedFolders);
                    });
            });
        });
    });
    describe('PATCH /api/folders/:folder_id', () => {
        context('Given no folders', () => {
            it('responds with 404', () => {
                const idToUpdate = 1234;
                return supertest(app)
                    .patch(`/api/folders/${idToUpdate}`)
                    .expect(404, {
                        error: { message: `Folder doesn't exist` }
                    });
            });
        });
        context('Given there are folders in db', () => {
            const testFolders = makeFoldersArray();
            beforeEach('insert folders', () => {
                return db
                    .insert(testFolders)
                    .into('folders');
            });
            //console.log('reach hereeeee')
            it('responds with 204 and updates the folder', () => {
                const idToUpdate = 1;
                const updatedFolder = {
                    name: 'updated folder'
                };
                const expectedFolder = {
                    ...testFolders[idToUpdate - 1],
                    ...updatedFolder
                };
                
                //console.log('folder id isssss ', expectedFolder.id)
                //console.log(Object.entries(expectedFolder))
                return supertest(app)
                    .patch(`/api/folders/${idToUpdate}`)
                    .send(updatedFolder)
                    .expect(204)
                    .then(() => {
                        supertest(app)
                            .get(`/api/folders/${idToUpdate}`)
                            .expect(expectedFolder);
                    });
            });
            it('responds with 400 when no required field supplied', () => {
                const idToUpdate = 2;
                return supertest(app)
                    .patch(`/api/folders/${idToUpdate}`)
                    .expect(400, {
                        error: {message: `Request body must contain 'name'`}
                    });
            });
        });
    });
});