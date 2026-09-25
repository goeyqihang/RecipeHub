import { Routes } from '@angular/router';
import { Register } from './components/auth/register/register';
import { Login } from './components/auth/login/login';
import { Dashboard } from './components/index/dashboard/dashboard';
import { authGuard } from './guard/auth-guard';
import { NotFound } from './components/not-found/not-found';
import { publicGuard } from './guard/public-guard';
import { RecipeList } from './components/recipes/recipe-list/recipe-list';
import { RecipeAdd } from './components/recipes/recipe-add/recipe-add';
import { RecipeView } from './components/recipes/recipe-view/recipe-view';
import { RecipeEdit } from './components/recipes/recipe-edit/recipe-edit';
import { AccessDenied } from './components/access-denied/access-denied';
import { recipeOwnerGuard } from './guard/recipe-owner-guard';
import { hasRoleGuard } from './guard/has-role-guard';
import { InventoryList } from './components/inventory/inventory-list/inventory-list';
import { InventoryAdd } from './components/inventory/inventory-add/inventory-add';
import { InventoryView } from './components/inventory/inventory-view/inventory-view';
import { InventoryEdit } from './components/inventory/inventory-edit/inventory-edit';
import { RecipeAnalysis } from './components/recipes/recipe-analysis/recipe-analysis';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    {
        path: 'register',
        component: Register,
        canActivate: [publicGuard]
    },

    {
        path: 'login',
        component: Login,
        canActivate: [publicGuard]
    },

    // Protected route - requires authentication
    {
        path: 'dashboard',
        component: Dashboard,
        canActivate: [authGuard] // Apply the AuthGuard here
    },
    {
        path: 'recipes',
        canActivate: [authGuard,hasRoleGuard], // Apply the AuthGuard here
        data: { roles: ['chef'] },
        children: [
            {
                path: '',
                component: RecipeList,
                title: 'Recipe List'
            },
            {
                path: 'add',
                component: RecipeAdd,
                title: 'Add Recipe'
            },
            {
                path: 'view/:recipeId',
                component: RecipeView,
                title: 'View Recipe'
            },
            {
                canActivate: [recipeOwnerGuard],
                path: 'edit/:recipeId',
                component: RecipeEdit,
                title: 'Edit Recipe'
            },
            {
                path: 'analysis/:recipeId',
                component: RecipeAnalysis,
                title: 'Recipe Health Analysis'
            }

        ]
    },
    {
        path: 'inventory',
        canActivate: [authGuard],
        children: [
            {
                path: '',
                component: InventoryList,
                title: 'Inventory List'
            },
            {
                path: 'add',
                component: InventoryAdd,
                title: 'Add Inventory Item'
            },
            {
                path: 'view/:inventoryId',
                component: InventoryView,
                title: 'View Inventory Item'
            },
            {
                path: 'edit/:inventoryId',
                component: InventoryEdit,
                title: 'Edit Inventory Item'
            }

        ]
    },

    {
        path: 'access-denied',
        component: AccessDenied,
        canActivate: [authGuard],
        title: 'Access Denied'
    },

    // Wildcard route for a 404 page - must be the last route
    { path: '**', component: NotFound }
];
