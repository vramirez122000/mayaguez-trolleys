module.exports = function(grunt) {

    var srcDir = '.';

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        srcDir: srcDir,
        depsDir: srcDir,
        jshint: {
            files: [
                'Gruntfile.js',
                '<%= srcDir %>/mayaguez-trolley-map.js',
            ],
            options: {
                multistr: true
            }
        },
        uglify: {
            build: {
                files: [{
                    src: '<%= srcDir %>/mayaguez-trolley-map.js',
                    dest: '<%= srcDir %>/mayatrolley.min.js'
                }]
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // Default task(s).
    grunt.registerTask('default', ['jshint','uglify']);

};