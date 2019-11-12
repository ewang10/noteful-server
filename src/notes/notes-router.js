const path = require('path');
const express = require('express');
const NotesService = require('./notes-service');
const xss = require('xss');

const notesRouter = express.Router();
const jsonParser = express.json();

const serializeNotes = note => ({
    id: note.id,
    name: xss(note.name),
    modified: new Date(note.modified),
    folderid: note.folderid,
    content: xss(note.content)
});

notesRouter
    .route('/')
    .get((req, res, next) => {
        NotesService.getAllNotes(req.app.get('db'))
            .then(notes => {
                res.json(notes.map(serializeNotes))
            })
            .catch(next);
    })
    .post(jsonParser, (req, res, next) => {
        const {name, modified, folderid, content} = req.body;
        const newNote = {name, folderid};

        for(const [key, value] of Object.entries(newNote)) {
            if (value == null) {
                return res.status(400).json({
                    error: {message: `Missing '${key}' in request body`}
                });
            }
        }
        newNote.content = content;
        newNote.modified = modified;

        NotesService.insertNote(
            req.app.get('db'),
            newNote
        )
            .then(note => {
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl) + `/${note.id}`)
                    .json(serializeNotes(note))
            })
            .catch(next);
    })

notesRouter
    .route('/:note_id')
    .all((req, res, next) => {
        NotesService.getById(
            req.app.get('db'),
            req.params.note_id
        )
            .then(note => {
                if (!note) {
                    return res.status(404).json({
                        error: { message: `Note doesn't exist` }
                    })
                }
                res.note = note;
                next();
            })
            .catch(next);
    })
    .get((req, res, next) => {
        res.json(serializeNotes(res.note));
    })
    .delete((req, res, next) => {
        NotesService.deleteNote(
            req.app.get('db'),
            req.params.note_id
        )
            .then(() => {
                res.status(204).end();
            })
            .catch(next);
    })
    .patch(jsonParser, (req, res, next) => {
        const {name, folderid, content, modified} = req.body;
        const noteToUpdate = {name, folderid};
        const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length;

        if(numberOfValues === 0) {
            return res.status(400).json({
                error: {message: `Request body must contain either 'name', or 'folderid'`}
            });
        }

        noteToUpdate.content = content;
        noteToUpdate.modified = modified;

        NotesService.updateNote(
            req.app.get('db'),
            req.params.note_id,
            noteToUpdate
        )
            .then(() => {
                res.status(204).end();
            })
            .catch(next);
    })

module.exports = notesRouter;