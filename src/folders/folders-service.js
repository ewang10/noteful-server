const FoldersService = {
    getAllFolders(knex) {
        return knex.select('*').from('folders');
    },
    getById(knex, id) {
        return knex
            .select('*')
            .from('folders')
            .where('id', id)
            .first();
    },
    insertFolder(knex, newFolder) {
        return knex
            .insert(newFolder)
            .into('folders')
            .returning('*')
            .then(rows => {
                return rows[0];
            });
    },
    updateFolder(knex, id, newFolderFields) {
        return knex('folders')
            .where({id})
            .update(newFolderFields);
    },
    deleteFolder(knex, id) {
        return knex('folders')
            .where({id})
            .delete();
    }
};

module.exports = FoldersService;