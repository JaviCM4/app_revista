<template>
    <v-app-bar height="80" color="teal-darken-4"
        image="https://getsynccom.wpenginepowered.com/wp-content/uploads/2023/08/aspera-vs-signiant-vs-resilio-2.jpg">
        <template #prepend>
            <v-btn>
                <v-icon>mdi-view-headline</v-icon>
            </v-btn>
        </template>

        <v-app-bar-title>Revista Xela</v-app-bar-title>
        <v-spacer />

    </v-app-bar>

    <v-navigation-drawer temporary width="350">
        <v-divider />

        <v-list>
            <v-list-item to="/" title="Inicio" prepend-icon="mdi-home" router />
            <v-list-item to="/iniciar-sesion" title="Iniciar Sesión" prepend-icon="mdi-login" router />
            <v-list-item to="/crear-usuario" title="Crear Cuenta" prepend-icon="mdi-account-plus" router />
        </v-list>
    </v-navigation-drawer>
</template>

<style scoped>
    .v-chip {
    font-weight: 600;
    }

    .text-red-accent-2 {
    color: rgb(255, 82, 82) !important;
    }

    .text-orange-accent-2 {
    color: rgb(255, 171, 64) !important;
    }

    .text-green-accent-2 {
    color: rgb(34, 197, 94) !important;
    }
</style>